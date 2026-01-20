/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument, Range } from "vscode-languageserver-textdocument";
import {
    SepticComment,
    SepticAttribute,
    SepticObject,
    SepticAttributeValue,
    SepticTokenType,
} from "./elements";

import {
    AlgVisitor,
    parseAlg,
    AlgCalc,
    AlgExpr,
    AlgLiteral,
    AlgTokenType,
    AlgParsingErrorType,
} from "./alg";

import {
    fromCalcIndexToParamIndex,
    getCalcParamIndexInfo,
    getIndexOfParam,
    getValueOfAlgExpr,
} from "./calc";

import {
    SepticReference,
    RefValidationFunction,
    defaultRefValidationFunction,
    ReferenceType,
} from "./reference";

import {
    ISepticObjectDocumentation,
    SepticAttributeDocumentation,
    SepticCalcInfo,
    SepticObjectInfo,
    SepticCalcParameterInfo,
    SepticMetaInfoProvider,
} from "./metaInfoProvider";

import { SepticCnfg } from "./cnfg";
import { SepticContext } from "./context";

export function isPureJinja(str: string) {
    return /^\{\{.*\}\}$/.test(str);
}

export const disableDiagnosticRegex =
    /\/\/\s+noqa\b(?::([ \w,]*))?|\{#\s+noqa\b(?::([ \w,]*))?\s*#\}/i;
export const diagnosticCodeRegex = /(E|W)[0-9]{3}/;
const jinjaRegex = /\{\{[\S\s]*?\}\}|\{%[\S\s]*?%\}/;
const blockCommentRegex = /^\/\*(\s[\S\s]*\s|\s)\*\/$/;
const lineCommentRegex = /^\/\/(\s.*|)$/;
const maxAlgLength = 250;

/*
    Code system:
    1**: Object
    2**: Alg/Calc
    3**: Attributes
    4**: Structure
    5**: References
    6**: Comments
*/
export enum SepticDiagnosticCode {
    invalidIdentifier = "W101",
    missingIdentifier = "E102",
    unknownObjectType = "E103",
    invalidAlg = "E201",
    unknownCalc = "E202",
    invalidDataTypeArg = "W203", // Possible error
    invalidNumberOfParams = "W204", // Possible error
    missingValueNonOptionalArg = "W205", // Might be removed
    algMaxLength = "E206",
    missingPublicProperty = "E207", // Combine with under
    unknownPublicProperty = "E208",
    jinjaExpressionInAlg = "W209",
    missingListLengthValue = "E301",
    mismatchLengthList = "E302",
    missingAttributeValue = "E303",
    unknownAttribute = "W304",
    missingListAttribute = "E305",
    invalidDataTypeAttribute = "E306",
    unexpectedList = "E307",
    invalidCharInString = "E308",
    badCycleInAlgs = "W308",
    duplicatedAttribute = "W309",
    invalidParentObject = "W401",
    missingParentObject = "W402",
    missingReference = "W501",
    invalidReference = "W502",
    unusedEvr = "W503",
    duplicate = "W504",
    invalidComment = "W601",
}

export enum SepticDiagnosticLevel {
    error = "error",
    warning = "warning",
    information = "information",
    hint = "hint",
}

export interface DiagnosticsSettings {
    readonly enabled: boolean;
}

export const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
};

export interface SepticDiagnostic {
    level: SepticDiagnosticLevel;
    code: SepticDiagnosticCode;
    message: string;
    range: Range;
    uri?: string | undefined;
}

function createDiagnostic(
    level: SepticDiagnosticLevel,
    range: Range,
    message: string,
    code: SepticDiagnosticCode,
    uri?: string,
): SepticDiagnostic {
    return {
        level: level,
        range: range,
        message: message,
        code: code,
        uri: uri,
    };
}

export function validateStandAloneCalc(
    alg: string,
    contextProvider: SepticContext,
): SepticDiagnostic[] {
    const doc = TextDocument.create("", "", 0, `"${alg}"`);
    const algAttrValue = new SepticAttributeValue(
        `"${alg}"`,
        SepticTokenType.string,
    );
    return validateAlg(algAttrValue, doc, contextProvider);
}

export function getDiagnostics(
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    diagnostics.push(...validateObjects(cnfg, contextProvider));
    diagnostics.push(...validateAlgs(cnfg, contextProvider));
    diagnostics.push(...validateComments(cnfg));
    const disabledLines = getDisabledLines(cnfg.comments, cnfg.doc);
    const filteredDiags = diagnostics.filter((diag) => {
        const disabledLine = disabledLines.get(diag.range.start.line);
        if (!disabledLine) {
            return true;
        }
        if (disabledLine.all) {
            return false;
        }
        for (const code of disabledLine.diagnosticCodes) {
            if (code === diag.code) {
                return false;
            }
        }
        return true;
    });
    return filteredDiags.map((diag) => {
        diag.uri = cnfg.uri;
        return diag;
    });
}

export function validateComments(cnfg: SepticCnfg): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    for (const comment of cnfg.comments) {
        if (!checkSepticComment(comment)) {
            diagnostics.push(
                createDiagnostic(
                    SepticDiagnosticLevel.error,
                    {
                        start: cnfg.positionAt(comment.start),
                        end: cnfg.positionAt(comment.end),
                    },
                    `Invalid comment. Correct format is //{whitespace}... or /*{whitespace}...{whitespace}*/`,
                    SepticDiagnosticCode.invalidComment,
                ),
            );
        }
    }
    return diagnostics;
}

function checkSepticComment(comment: SepticComment): boolean {
    if (comment.type === SepticTokenType.blockComment) {
        return blockCommentRegex.test(comment.content);
    } else if (comment.type === SepticTokenType.lineComment) {
        return lineCommentRegex.test(comment.content);
    }
    return true;
}

export function validateAlgs(
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    const algAttrs = cnfg.objects
        .filter((obj) => obj.type === "CalcPvr" && obj.hasAttribute("Alg"))
        .map((obj) => obj.getAttribute("Alg")!);

    for (let i = 0; i < algAttrs.length; i++) {
        const algAttrValue = algAttrs[i]!.getFirstAttributeValueObject();
        if (!algAttrValue) {
            continue;
        }
        diagnostics.push(
            ...validateAlg(algAttrValue, cnfg.doc, contextProvider),
        );
    }
    return diagnostics;
}

type AlgPositionTransformer = (start: number, end: number) => Range;

export function validateAlg(
    alg: SepticAttributeValue,
    doc: TextDocument,
    contextProvider: SepticContext,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];

    if (!checkAlgLength(alg.getValue())) {
        diagnostics.push(
            createDiagnostic(
                SepticDiagnosticLevel.error,
                {
                    start: doc.positionAt(alg.start),
                    end: doc.positionAt(alg.end),
                },
                `Alg exceed the maximum length of ${maxAlgLength} chars`,
                SepticDiagnosticCode.algMaxLength,
            ),
        );
    }
    const offsetStartAlg = alg.start + 1;
    const algPositionTransformer: AlgPositionTransformer = (
        start: number,
        end: number,
    ): Range => {
        return {
            start: doc.positionAt(start + offsetStartAlg),
            end: doc.positionAt(end + offsetStartAlg),
        };
    };
    let expr;
    try {
        expr = parseAlg(alg.getValue());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        let code = SepticDiagnosticCode.invalidAlg;
        let level: SepticDiagnosticLevel = SepticDiagnosticLevel.error;
        if (error.type === AlgParsingErrorType.unsupportedJinja) {
            code = SepticDiagnosticCode.jinjaExpressionInAlg;
            level = SepticDiagnosticLevel.warning;
        }
        const diagnostic = createDiagnostic(
            level,
            algPositionTransformer(error.token.start, error.token.end),
            error.message,
            code,
        );
        diagnostics.push(diagnostic);
        return diagnostics;
    }
    const visitor = new AlgVisitor();
    visitor.visit(expr);
    visitor.calcs.forEach((calc) => {
        diagnostics.push(
            ...validateCalc(calc, contextProvider, algPositionTransformer),
        );
    });
    visitor.variables.forEach((variable) => {
        diagnostics.push(
            ...validateAlgVariable(
                variable,
                contextProvider,
                algPositionTransformer,
            ),
        );
    });
    return diagnostics;
}

export function validateAlgVariable(
    variable: AlgLiteral,
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    if (isPureJinja(variable.value)) {
        return [];
    }
    const variableParts = variable.value.split(".");
    if (
        !contextProvider.validateReferences(
            variableParts[0]!,
            defaultRefValidationFunction,
        )
    ) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                algPositionTransformer(variable.start, variable.end),
                `Reference to undefined variable: ${variable.value}`,
                SepticDiagnosticCode.missingReference,
            ),
        ];
    }
    if (variableParts.length === 1) {
        return [];
    }
    if (variableParts[1] === "") {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.error,
                algPositionTransformer(variable.end - 1, variable.end),
                `Missing public property for variable`,
                SepticDiagnosticCode.missingPublicProperty,
            ),
        ];
    }
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let referencedObjects = contextProvider.getObjectsByIdentifier(
        variableParts[0]!,
    );
    referencedObjects = referencedObjects.filter((obj) => obj.isXvr);
    if (!referencedObjects.length) {
        return [];
    }
    const publicAttributes = metaInfoProvider.getObjectDocumentation(
        referencedObjects[0]!.type,
    )?.publicAttributes;

    if (!publicAttributes?.includes(variableParts[1]!)) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.error,
                algPositionTransformer(
                    variable.end - variableParts[1]!.length,
                    variable.end,
                ),
                `Unknown public property ${variableParts[1]} for ${referencedObjects[0]!.type}'`,
                SepticDiagnosticCode.unknownPublicProperty,
            ),
        ];
    }
    return [];
}

export function validateCalc(
    calc: AlgCalc,
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: SepticDiagnostic[] = [];
    const calcMetaInfo = metaInfoProvider.getCalc(calc.identifier);
    if (!calcMetaInfo) {
        const diagnostic = createDiagnostic(
            SepticDiagnosticLevel.warning,
            algPositionTransformer(calc.start, calc.end),
            `Unknown function: ${calc.identifier}`,
            SepticDiagnosticCode.unknownCalc,
        );
        return [diagnostic];
    }
    diagnostics.push(
        ...validateCalcParams(
            calc,
            calcMetaInfo,
            contextProvider,
            algPositionTransformer,
        ),
    );
    return diagnostics;
}

function validateCalcParams(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    for (let index = 0; index < calc.getNumParams(); index++) {
        const paramExpr = calc.params[index];
        const calcParamIndex = fromCalcIndexToParamIndex(calc, calcInfo, index);
        const paramInfo = calcInfo.parameters[calcParamIndex];
        if (!paramInfo) {
            continue;
        }
        diagnostics.push(
            ...validateSingleParam(
                paramExpr!,
                paramInfo,
                contextProvider,
                algPositionTransformer,
            ),
        );
    }
    diagnostics.push(
        ...validateCalcParamsLength(calc, calcInfo, algPositionTransformer),
    );
    return diagnostics;
}

function validateSingleParam(
    paramExpr: AlgExpr,
    paramInfo: SepticCalcParameterInfo,
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    if (isEmptyNonOptionalParam(paramExpr, paramInfo)) {
        diagnostics.push(
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                algPositionTransformer(paramExpr.start, paramExpr.end),
                `Missing value for non-optional parameter`,
                SepticDiagnosticCode.missingValueNonOptionalArg,
            ),
        );
    }
    diagnostics.push(
        ...validateParamType(
            paramExpr,
            paramInfo.datatype,
            contextProvider,
            algPositionTransformer,
        ),
    );
    return diagnostics;
}

function validateCalcParamsLength(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    const paramInfo = getCalcParamIndexInfo(calcInfo);
    const numFixedParamsPre = paramInfo.fixedLengthParams.pre.length
        ? paramInfo.fixedLengthParams.pre[
              paramInfo.fixedLengthParams.pre.length - 1
          ]!
        : 0;
    const numFixedParamsPost = paramInfo.fixedLengthParams.post.length
        ? paramInfo.fixedLengthParams.post[
              paramInfo.fixedLengthParams.post.length - 1
          ]! - numFixedParamsPre
        : 0;
    const numVariableParams = paramInfo.variableLengthParams.num;
    const numParams = calc.getNumParams();
    if (!numVariableParams) {
        if (
            numParams <
            numFixedParamsPre - paramInfo.fixedLengthParams.numOptional
        ) {
            return [
                createDiagnostic(
                    SepticDiagnosticLevel.warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Missing parameter(s). Expected min ${
                        numFixedParamsPre -
                        paramInfo.fixedLengthParams.numOptional
                    } params but got ${numParams}`,
                    SepticDiagnosticCode.invalidNumberOfParams,
                ),
            ];
        }
        if (numParams > numFixedParamsPre) {
            return [
                createDiagnostic(
                    SepticDiagnosticLevel.warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Too many parameters. Expected max ${numFixedParamsPre} params but got ${numParams}`,
                    SepticDiagnosticCode.invalidNumberOfParams,
                ),
            ];
        }
        return [];
    }
    if (paramInfo.variableLengthParams.exactLength) {
        const indexDesignatorParam = getIndexOfParam(
            paramInfo.variableLengthParams.exactLength,
            calcInfo,
        );
        if (!indexDesignatorParam) {
            return [];
        }
        if (indexDesignatorParam >= calc.params.length) {
            return [];
        }
        const designatorValue = getValueOfAlgExpr(
            calc.params[indexDesignatorParam]!,
        );
        if (designatorValue === undefined) {
            return [];
        }
        const expectedNumParams =
            numVariableParams * designatorValue +
            numFixedParamsPre +
            numFixedParamsPost;
        if (numParams !== expectedNumParams) {
            return [
                createDiagnostic(
                    SepticDiagnosticLevel.warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Invalid number of parameters. Expected ${expectedNumParams} params but got ${numParams}`,
                    SepticDiagnosticCode.invalidNumberOfParams,
                ),
            ];
        }
        return [];
    }

    if (
        (numParams - numFixedParamsPre - numFixedParamsPost) %
            numVariableParams !==
            0 ||
        numParams === 0 ||
        numParams < numFixedParamsPre + numFixedParamsPost + numVariableParams
    ) {
        const minNumParams =
            numFixedParamsPre + numFixedParamsPost + numVariableParams;
        const oddOrEven =
            (numVariableParams + numFixedParamsPre + numFixedParamsPost) % 2 ===
            0
                ? "even"
                : "odd";
        return [
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                algPositionTransformer(calc.start, calc.end),
                `Invalid number of parameters. Expected min ${minNumParams} parameters and an ${oddOrEven} number of parameters but got ${numParams}`,
                SepticDiagnosticCode.invalidNumberOfParams,
            ),
        ];
    }
    return [];
}

function isEmptyNonOptionalParam(
    expr: AlgExpr,
    paramInfo: SepticCalcParameterInfo,
) {
    return (
        expr instanceof AlgLiteral &&
        !expr.value.length &&
        paramInfo.arity !== "?"
    );
}

function checkAlgLength(alg: string) {
    if (jinjaRegex.test(alg)) {
        return true;
    }
    return alg.length <= maxAlgLength;
}

function validateParamType(
    expr: AlgExpr,
    types: string[],
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    if (types[0]!.startsWith("value")) {
        return [];
    }
    return validateObjectParamType(
        expr,
        types,
        contextProvider,
        algPositionTransformer,
    );
}

function validateObjectParamType(
    expr: AlgExpr,
    types: string[],
    contextProvider: SepticContext,
    algPositionTransformer: AlgPositionTransformer,
): SepticDiagnostic[] {
    if (!isAlgExprObjectReference(expr)) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                algPositionTransformer(expr.start, expr.end),
                `Wrong data type for parameter. Expected data type for parameter: ${types.join(",")}}`,
                SepticDiagnosticCode.invalidDataTypeArg,
            ),
        ];
    }
    const exprLiteral = expr as AlgLiteral;
    const objects = contextProvider.getObjectsByIdentifier(
        exprLiteral.value.split(".")[0]!,
    );
    for (const obj of objects) {
        if (types.includes(obj.type.toLowerCase())) {
            return [];
        }
    }
    return [
        createDiagnostic(
            SepticDiagnosticLevel.warning,
            algPositionTransformer(expr.start, expr.end),
            `Wrong data type for parameter: ${exprLiteral.value}. Expected data type for parameter: ${types.join(",")}}`,
            SepticDiagnosticCode.invalidDataTypeArg,
        ),
    ];
}

function isAlgExprObjectReference(expr: AlgExpr) {
    return expr instanceof AlgLiteral && expr.type === AlgTokenType.identifier;
}

export function validateObjects(
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): SepticDiagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: SepticDiagnostic[] = [];
    for (const obj of cnfg.objects) {
        const objectDoc = metaInfoProvider.getObjectDocumentation(obj.type);
        const objectInfo = metaInfoProvider.getObject(obj.type);
        if (!objectDoc) {
            diagnostics.push(
                createDiagnostic(
                    SepticDiagnosticLevel.error,
                    {
                        start: cnfg.positionAt(obj.start),
                        end: cnfg.positionAt(obj.start + obj.type.length),
                    },
                    "Unknown object type",
                    SepticDiagnosticCode.unknownObjectType,
                ),
            );
            continue;
        }
        diagnostics.push(
            ...validateObject(
                obj,
                cnfg.doc,
                contextProvider,
                objectDoc,
                objectInfo,
            ),
        );
    }
    return diagnostics;
}

export function validateObject(
    obj: SepticObject,
    doc: TextDocument,
    contextProvider: SepticContext,
    objectDoc: ISepticObjectDocumentation,
    objectInfo: SepticObjectInfo | undefined,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    diagnostics.push(...validateObjectParent(obj, doc));
    diagnostics.push(...validateIdentifier(obj, doc));
    diagnostics.push(
        ...validateObjectReferences(obj, doc, contextProvider, objectInfo),
    );
    const baseAttributes: Map<string, SepticAttribute[]> = new Map();
    for (const attr of obj.attributes) {
        diagnostics.push(
            ...validateAttribute(attr, doc, objectDoc, baseAttributes),
        );
    }
    checkForDuplicateAttributes(baseAttributes, diagnostics, doc);
    return diagnostics;
}

function checkForDuplicateAttributes(
    baseAttributes: Map<string, SepticAttribute[]>,
    diagnostics: SepticDiagnostic[],
    doc: TextDocument,
) {
    for (const [key, attrs] of baseAttributes) {
        if (attrs.length > 1) {
            for (const attr of attrs) {
                diagnostics.push(
                    createDiagnostic(
                        SepticDiagnosticLevel.warning,
                        {
                            start: doc.positionAt(attr.start),
                            end: doc.positionAt(attr.start + attr.key.length),
                        },
                        `Duplicated attribute ${key}`,
                        SepticDiagnosticCode.duplicatedAttribute,
                    ),
                );
            }
        }
    }
}

export function validateIdentifier(
    obj: SepticObject,
    doc: TextDocument,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    if (!obj.identifier) {
        const diagnostic: SepticDiagnostic = createDiagnostic(
            SepticDiagnosticLevel.error,
            {
                start: doc.positionAt(obj.start),
                end: doc.positionAt(obj.start + obj.type.length),
            },
            `Missing identifier for object of type ${obj.type}`,
            SepticDiagnosticCode.missingIdentifier,
        );
        diagnostics.push(diagnostic);
        return diagnostics;
    }

    if (obj.isType("FdtaProc") || checkIdentifier(obj.identifier.name)) {
        return [];
    }

    return [
        createDiagnostic(
            SepticDiagnosticLevel.error,
            {
                start: doc.positionAt(obj.identifier.start),
                end: doc.positionAt(obj.identifier.end),
            },
            `Invalid identifier. Identifier needs to contain minimum one letter. Allowed chars: [a-z, A-Z, 0-9, _, -]. Jinja-expressions are allowed for SCG`,
            SepticDiagnosticCode.invalidIdentifier,
        ),
    ];
}

export function validateObjectReferences(
    obj: SepticObject,
    doc: TextDocument,
    contextProvider: SepticContext,
    objectMetaInfo: SepticObjectInfo | undefined,
): SepticDiagnostic[] {
    if (!objectMetaInfo) {
        return [];
    }
    const diagnostics: SepticDiagnostic[] = [];
    diagnostics.push(
        ...validateDuplicateIdentifiers(obj, contextProvider, doc),
    );
    if (obj.isType("Evr")) {
        diagnostics.push(...validateEvrReferences(obj, contextProvider, doc));
    }
    if (shouldValidateIdentifier(objectMetaInfo, obj)) {
        if (obj.isType("CalcPvr")) {
            diagnostics.push(
                ...validateCalcPvrIdentifierReferences(
                    obj,
                    contextProvider,
                    doc,
                ),
            );
        } else if (obj.isType("UAAppl")) {
            diagnostics.push(
                ...validateUAApplReferences(obj, contextProvider, doc),
            );
        } else {
            diagnostics.push(
                ...validateIdentifierReferences(
                    obj,
                    contextProvider,
                    objectMetaInfo,
                    doc,
                ),
            );
        }
    }
    for (const attr of objectMetaInfo.refs.attributes) {
        let attrValues = obj.getAttributeValueObjects(attr);
        if (!attrValues) {
            continue;
        }
        if (attrValues.length > 1) {
            attrValues = attrValues.slice(1);
        }

        for (const attrValue of attrValues) {
            const refName = attrValue.getValue();
            if (refName.length < 1) {
                continue;
            }
            const validRef = contextProvider.validateReferences(
                refName,
                defaultRefValidationFunction,
            );
            if (validRef) {
                continue;
            }
            diagnostics.push(
                createDiagnostic(
                    SepticDiagnosticLevel.warning,
                    {
                        start: doc.positionAt(attrValue.start),
                        end: doc.positionAt(attrValue.end),
                    },
                    `Reference to undefined Xvr ${attrValue.getValue()}`,
                    SepticDiagnosticCode.missingReference,
                ),
            );
        }
    }
    return diagnostics;
}

function shouldValidateIdentifier(
    objectMetaInfo: SepticObjectInfo,
    obj: SepticObject,
) {
    return objectMetaInfo.refs.identifier && obj.identifier && !obj.isXvr;
}

function validateIdentifierReferences(
    obj: SepticObject,
    contextProvider: SepticContext,
    objectMetaInfo: SepticObjectInfo,
    doc: TextDocument,
): SepticDiagnostic[] {
    const validRef = contextProvider.validateReferences(
        obj.identifier!.name,
        defaultRefValidationFunction,
    );
    if (validRef) {
        return [];
    }
    const severity = objectMetaInfo.refs.identifierOptional
        ? SepticDiagnosticLevel.hint
        : SepticDiagnosticLevel.warning;
    return [
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            `Reference to undefined Xvr ${obj.identifier!.name}`,
            SepticDiagnosticCode.missingReference,
        ),
    ];
}

const hasDuplicateReferenceXvr: RefValidationFunction = (
    refs: SepticReference[],
) => {
    let xvrsCount = 0;
    for (const ref of refs) {
        if (ref.obj?.isXvr) {
            xvrsCount += 1;
        }
    }
    return xvrsCount < 2;
};

const hasDuplicateReferenceSopcXvr: RefValidationFunction = (
    refs: SepticReference[],
) => {
    let sopcXvrsCount = 0;
    for (const ref of refs) {
        if (ref.obj?.isSopcXvr) {
            sopcXvrsCount += 1;
        }
    }
    return sopcXvrsCount < 2;
};

const hasDuplicateReferenceUaXvr: RefValidationFunction = (
    refs: SepticReference[],
) => {
    let uaXvrsCount = 0;
    for (const ref of refs) {
        if (ref.obj?.isUaXvr) {
            uaXvrsCount += 1;
        }
    }
    return uaXvrsCount < 2;
};

function validateDuplicateIdentifiers(
    obj: SepticObject,
    contextProvider: SepticContext,
    doc: TextDocument,
): SepticDiagnostic[] {
    if (!obj.identifier) {
        return [];
    }
    let validationFunction: RefValidationFunction;
    if (obj.isXvr) {
        validationFunction = hasDuplicateReferenceXvr;
    } else if (obj.isSopcXvr) {
        validationFunction = hasDuplicateReferenceSopcXvr;
    } else if (obj.isUaXvr) {
        validationFunction = hasDuplicateReferenceUaXvr;
    } else {
        return [];
    }
    const validRef = contextProvider.validateReferences(
        obj.identifier!.name,
        validationFunction,
    );
    if (validRef) {
        return [];
    }
    const severity = SepticDiagnosticLevel.warning;
    return [
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            `Duplicate Xvr with name: ${obj.identifier!.name}`,
            SepticDiagnosticCode.duplicate,
        ),
    ];
}

function validateCalcPvrIdentifierReferences(
    obj: SepticObject,
    contextProvider: SepticContext,
    doc: TextDocument,
): SepticDiagnostic[] {
    if (obj.identifier?.name.startsWith("_")) {
        return [];
    }
    const diagnostics: SepticDiagnostic[] = [];
    if (
        contextProvider.validateReferences(
            obj.identifier!.name,
            hasDuplicateCalcPvrRef,
        )
    ) {
        diagnostics.push(
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                {
                    start: doc.positionAt(obj.identifier!.start),
                    end: doc.positionAt(obj.identifier!.end),
                },
                `Duplicate CalcPvr with name: ${obj.identifier!.name}`,
                SepticDiagnosticCode.duplicate,
            ),
        );
    }
    const referenceToEvr = contextProvider.validateReferences(
        obj.identifier!.name,
        hasReferenceToEvr,
    );
    if (referenceToEvr) {
        return diagnostics;
    }
    const referenceToXvr = contextProvider.validateReferences(
        obj.identifier!.name,
        defaultRefValidationFunction,
    );
    const severity = referenceToXvr
        ? SepticDiagnosticLevel.warning
        : SepticDiagnosticLevel.hint;
    const message = referenceToXvr
        ? `CalcPvr references non Evr ${obj.identifier!.name}`
        : `No reference to Evr`;
    const code = referenceToXvr
        ? SepticDiagnosticCode.invalidReference
        : SepticDiagnosticCode.missingReference;
    diagnostics.push(
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            message,
            code,
        ),
    );
    return diagnostics;
}

function validateUAApplReferences(
    obj: SepticObject,
    contextProvider: SepticContext,
    doc: TextDocument,
): SepticDiagnostic[] {
    for (const object of contextProvider.getObjectsByIdentifier(
        obj.identifier!.name,
    )) {
        if (object.isType("SmpcAppl", "MPCAppl")) {
            return [];
        }
    }
    return [
        createDiagnostic(
            SepticDiagnosticLevel.warning,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            "Missing reference to SmpcAppl or MPCAppl",
            SepticDiagnosticCode.missingReference,
        ),
    ];
}

const hasReferenceToEvr: RefValidationFunction = (refs: SepticReference[]) => {
    for (const ref of refs) {
        if (ref.obj?.isType("Evr")) {
            return true;
        }
    }
    return false;
};

const hasDuplicateCalcPvrRef: RefValidationFunction = (
    refs: SepticReference[],
) => {
    let seen = false;
    for (const ref of refs) {
        if (ref.obj?.isType("CalcPvr")) {
            if (seen) {
                return true;
            }
            seen = true;
        }
    }
    return false;
};

export function validateEvrReferences(
    obj: SepticObject,
    contextProvider: SepticContext,
    doc: TextDocument,
) {
    const userInputAttrValue = obj.getAttributeFirstValueObject("UserInput");
    if (userInputAttrValue && userInputAttrValue.getValue() !== "OFF") {
        return [];
    }
    const name = obj.identifier?.name;
    if (!name) {
        return [];
    }
    const refs = contextProvider.getReferences(name);
    const calcPvrRef = refs?.find((ref) => {
        return ref.type === ReferenceType.calc || ref.obj?.type === "CalcPvr";
    });
    if (!calcPvrRef) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.warning,
                {
                    start: doc.positionAt(obj.identifier!.start),
                    end: doc.positionAt(obj.identifier!.end),
                },
                "Unused Evr. Evr not used in calcs or enabled user input",
                SepticDiagnosticCode.unusedEvr,
            ),
        ];
    }
    return [];
}

export function validateAttribute(
    attr: SepticAttribute,
    doc: TextDocument,
    objectDoc: ISepticObjectDocumentation,
    duplicates: Map<string, SepticAttribute[]>,
): SepticDiagnostic[] {
    const attrDoc = objectDoc.getAttribute(attr.key);
    const diagnostics: SepticDiagnostic[] = [];
    if (!attrDoc) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.error,
                {
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
                `Unknown attribute for Object of type ${objectDoc.name}`,
                SepticDiagnosticCode.unknownAttribute,
            ),
        ];
    }
    const duplicateAttrs = duplicates.get(attrDoc.basename);
    if (duplicateAttrs) {
        duplicateAttrs.push(attr);
    } else {
        duplicates.set(attrDoc.basename, [attr]);
    }
    const attrValues = attr.getAttributeValueObjects();
    diagnostics.push(
        ...validateAttributeNumValues(
            attrValues,
            attrDoc,
            attr.start,
            attr.start + attr.key.length,
            doc,
        ),
    );
    const startIndex = attrValues.length > 1 ? 1 : 0;
    diagnostics.push(
        ...validateAttributeValue(attrValues.slice(startIndex), attrDoc, doc),
    );
    return diagnostics;
}

function validateAttributeValue(
    attrValues: SepticAttributeValue[],
    attrDoc: SepticAttributeDocumentation,
    doc: TextDocument,
): SepticDiagnostic[] {
    const diagnostics: SepticDiagnostic[] = [];
    for (const attrValue of attrValues) {
        if (!checkAttributeDataType(attrValue, attrDoc)) {
            const datatypeFormatted = formatDataType(attrDoc);
            const errorMessage = `Wrong data type for attribute. Expected DataType: ${datatypeFormatted}`;
            diagnostics.push(
                createDiagnostic(
                    SepticDiagnosticLevel.error,
                    {
                        start: doc.positionAt(attrValue.start),
                        end: doc.positionAt(attrValue.end),
                    },
                    errorMessage,
                    SepticDiagnosticCode.invalidDataTypeAttribute,
                ),
            );
        }
        if (attrValue.type === SepticTokenType.string) {
            const indexInvalid = attrValue.getValue().indexOf("'");
            if (indexInvalid !== -1) {
                diagnostics.push(
                    createDiagnostic(
                        SepticDiagnosticLevel.error,
                        {
                            start: doc.positionAt(
                                attrValue.start + 1 + indexInvalid,
                            ),
                            end: doc.positionAt(
                                attrValue.start + 1 + indexInvalid + 1,
                            ),
                        },
                        `Invalid char in string: "'" `,
                        SepticDiagnosticCode.invalidCharInString,
                    ),
                );
            }
        }
    }
    return diagnostics;
}

function validateAttributeNumValues(
    attrValues: SepticAttributeValue[],
    attrDoc: SepticAttributeDocumentation,
    startAttr: number,
    endAttr: number,
    doc: TextDocument,
): SepticDiagnostic[] {
    const range = {
        start: doc.positionAt(startAttr),
        end: doc.positionAt(endAttr),
    };
    switch (attrValues.length) {
        case 0:
            return [
                createDiagnostic(
                    SepticDiagnosticLevel.error,
                    range,
                    `Missing value for attribute`,
                    SepticDiagnosticCode.missingAttributeValue,
                ),
            ];
        case 1:
            if (!attrDoc.list) {
                return [];
            }
            return [
                createDiagnostic(
                    SepticDiagnosticLevel.error,
                    range,
                    `Attribute expects list of values`,
                    SepticDiagnosticCode.missingListAttribute,
                ),
            ];
        default: {
            if (!attrDoc.list) {
                return [
                    createDiagnostic(
                        SepticDiagnosticLevel.error,
                        range,
                        `Attribute does not expect list of values`,
                        SepticDiagnosticCode.unexpectedList,
                    ),
                ];
            }
            if (!isInt(attrValues[0]!.value)) {
                return [
                    createDiagnostic(
                        SepticDiagnosticLevel.error,
                        range,
                        `First value needs to be positive int when multiple values are provided for attribute`,
                        SepticDiagnosticCode.missingListLengthValue,
                    ),
                ];
            }
            const numValues = parseInt(attrValues[0]!.value);
            if (attrValues.length - 1 !== numValues) {
                return [
                    createDiagnostic(
                        SepticDiagnosticLevel.error,
                        range,
                        `Incorrect number of values given. Expected: ${numValues} Actual: ${
                            attrValues.length - 1
                        }.`,
                        SepticDiagnosticCode.mismatchLengthList,
                    ),
                ];
            }
            return [];
        }
    }
}

export function validateObjectParent(
    obj: SepticObject,
    doc: TextDocument,
): SepticDiagnostic[] {
    const objectHierarchy =
        SepticMetaInfoProvider.getInstance().getObjectHierarchy();
    const expectedParents = objectHierarchy.nodes.get(obj.type)?.parents ?? [];
    if (expectedParents.length && !obj.parent) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.error,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `No parent object for object. Expected parent object of type: ${expectedParents}`,
                SepticDiagnosticCode.missingParentObject,
            ),
        ];
    }
    const parent = obj.parent?.type ?? "";
    if (expectedParents.length && !expectedParents.includes(parent)) {
        return [
            createDiagnostic(
                SepticDiagnosticLevel.error,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `Invalid parent object of type ${parent}. Expected parent object of type: ${expectedParents}`,
                SepticDiagnosticCode.invalidParentObject,
            ),
        ];
    }
    return [];
}

export function checkAttributeDataType(
    attrValue: SepticAttributeValue,
    attrDoc: SepticAttributeDocumentation,
): boolean {
    if (jinjaRegex.test(attrValue.value)) {
        return true;
    }
    switch (attrDoc.dataType) {
        case "int":
            return isInt(attrValue.value);
        case "float":
            return attrValue.type === SepticTokenType.numeric;
        case "string":
            return attrValue.type === SepticTokenType.string;
        case "enum":
            return attrDoc.enums.includes(attrValue.value);
        case "path":
            return true;
        case "variable":
            return (
                attrValue.type === SepticTokenType.string ||
                attrValue.type === SepticTokenType.identifier
            );
        default: {
            const bitMaskMatch = attrDoc.dataType.match(/^bit([0-9]+)$/);
            if (!bitMaskMatch) {
                return true;
            }
            const number = parseInt(bitMaskMatch[1]!);
            return RegExp(`^[01]{1,${number}}$`).test(attrValue.value);
        }
    }
}

function isInt(str: string) {
    return /^-?[0-9]+$/.test(str);
}

export function checkIdentifier(identifier: string): boolean {
    const ignoredPattern = /\{\{\s*[\w-]+\s*\}\}/g;

    const filteredIdentifier = identifier.replace(ignoredPattern, "");

    const containsLetter =
        /[a-zA-Z]/.test(filteredIdentifier) ||
        filteredIdentifier.length < identifier.length;

    const invalidChars = containsInvalidChars(filteredIdentifier);

    return containsLetter && !invalidChars;
}

function containsInvalidChars(str: string): boolean {
    const invalidCharsRegex = /[^a-zA-Z0-9_]/g;
    return invalidCharsRegex.test(str);
}

function getDisabledLines(
    comments: SepticComment[],
    doc: TextDocument,
): Map<number, { all: boolean; diagnosticCodes: string[] }> {
    const disabledLinesMap = new Map<
        number,
        { all: boolean; diagnosticCodes: string[] }
    >();
    for (const comment of comments) {
        const match = comment.content.match(disableDiagnosticRegex);
        if (!match) {
            continue;
        }
        const line = doc.positionAt(comment.start).line;
        const matchCode = match[1] ?? match[2];
        if (matchCode) {
            disabledLinesMap.set(line, {
                all: false,
                diagnosticCodes: getDiagnosticCodes(matchCode),
            });
            continue;
        }
        disabledLinesMap.set(line, { all: true, diagnosticCodes: [] });
    }
    return disabledLinesMap;
}

function getDiagnosticCodes(codes: string): string[] {
    const splitCodes = codes.split(",");
    const diagnosticCodes: string[] = [];
    splitCodes.forEach((code) => {
        const trimedCode = code.trim();
        if (diagnosticCodeRegex.test(trimedCode)) {
            diagnosticCodes.push(trimedCode);
        }
    });
    return diagnosticCodes;
}

function formatDataType(attrDoc: SepticAttributeDocumentation) {
    let output = capitalizeFirstLetter(attrDoc.dataType);
    if (attrDoc.dataType === "enum") {
        output += "[" + attrDoc.enums.join(", ") + "]";
    }
    if (attrDoc.list) {
        output += "[ ]";
    }
    return output;
}

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
