/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgVisitor,
    SepticCnfg,
    SepticMetaInfoProvider,
    parseAlg,
    SepticReferenceProvider,
    SepticComment,
    Attribute,
    SepticObject,
    defaultRefValidationFunction,
    AlgCalc,
    AlgExpr,
    AlgLiteral,
    AlgTokenType,
    SepticCalcInfo,
    ISepticObjectDocumentation,
    AttributeValue,
    SepticAttributeDocumentation,
    SepticTokenType,
    SepticObjectInfo,
    fromCalcIndexToParamIndex,
    SepticCalcParameterInfo,
    VALUE,
    getCalcParamIndexInfo,
    getIndexOfParam,
    getValueOfAlgExpr,
    formatDataType,
    RefValidationFunction,
    SepticReference,
    ReferenceType,
} from "../septic";
import { SettingsManager } from "../settings";
import { isPureJinja } from "../util";
import { DocumentProvider } from '../documentProvider';

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
export enum DiagnosticCode {
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
    missingListLengthValue = "E301",
    mismatchLengthList = "E302",
    missingAttributeValue = "E303",
    unknownAttribute = "W304",
    missingListAttribute = "E305",
    invalidDataTypeAttribute = "E306",
    unexpectedList = "E307",
    invalidCharInString = "E308",
    badCycleInAlgs = "W308",
    invalidParentObject = "W401",
    missingParentObject = "W402",
    missingReference = "W501",
    invalidReference = "W502",
    unusedEvr = "W503",
    duplicate = "W504",
    invalidComment = "W601",
}

export enum DiagnosticLevel {
    error = "error",
    warning = "warning",
    hint = "hint",
    ignore = "ignore",
}

export interface DiagnosticsSettings {
    readonly enabled: boolean;
}

export const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
};

function createDiagnostic(
    severity: DiagnosticSeverity,
    range: Range,
    message: string,
    code: DiagnosticCode
): Diagnostic {
    return {
        severity: severity,
        range: range,
        message: message,
        code: code,
        source: "septic",
    };
}

export class DiagnosticProvider {
    private readonly cnfgProvider: ISepticConfigProvider;
    private readonly docProvider: DocumentProvider;
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: ISepticConfigProvider,
        docProvider: DocumentProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.docProvider = docProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideDiagnostics(
        uri: string,
        refProvider: SepticReferenceProvider
    ): Promise<Diagnostic[]> {
        const cnfg = await this.cnfgProvider.get(uri);
        if (cnfg === undefined) {
            return [];
        }
        const doc = await this.docProvider.getDocument(uri);
        if (doc === undefined) {
            return [];
        }
        const settingsWorkspace = await this.settingsManager.getSettings();
        const settings =
            settingsWorkspace?.diagnostics ?? defaultDiagnosticsSettings;

        if (!settings.enabled) {
            return [];
        }
        await refProvider.load();
        return getDiagnostics(cnfg, doc, refProvider);
    }
}

export function validateStandAloneCalc(alg: string, refProvider: SepticReferenceProvider): Diagnostic[] {
    const doc = TextDocument.create("", "", 0, `"${alg}"`);
    const algAttrValue = new AttributeValue(`"${alg}"`, SepticTokenType.string);
    return validateAlg(algAttrValue, doc, refProvider);
}

export function getDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
) {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...validateObjects(cnfg, doc, refProvider));
    diagnostics.push(...validateAlgs(cnfg, doc, refProvider));
    diagnostics.push(...validateComments(cnfg, doc));
    const disabledLines = getDisabledLines(cnfg.comments, doc);
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
    return filteredDiags;
}

export function validateComments(
    cnfg: SepticCnfg,
    doc: ITextDocument
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const comment of cnfg.comments) {
        if (!checkSepticComment(comment)) {
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(comment.start),
                        end: doc.positionAt(comment.end),
                    },
                    `Invalid comment. Correct format is //{whitespace}... or /*{whitespace}...{whitespace}*/`,
                    DiagnosticCode.invalidComment
                )
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
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const algAttrs = cnfg.getAlgAttrs();

    for (let i = 0; i < algAttrs.length; i++) {
        const algAttrValue = algAttrs[i].getAttrValue();
        if (!algAttrValue) {
            continue;
        }
        diagnostics.push(...validateAlg(algAttrValue, doc, refProvider));
    }
    return diagnostics;
}

type AlgPositionTransformer = (start: number, end: number) => Range;

export function validateAlg(alg: AttributeValue, doc: ITextDocument, refProvider: SepticReferenceProvider): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (!checkAlgLength(alg.getValue())) {
        diagnostics.push(
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(alg.start),
                    end: doc.positionAt(alg.end),
                },
                `Alg exceed the maximum length of ${maxAlgLength} chars`,
                DiagnosticCode.algMaxLength
            )
        );
    }
    const offsetStartAlg = alg.start + 1;
    const algPositionTransformer: AlgPositionTransformer = (start: number, end: number): Range => {
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
        const diagnostic = createDiagnostic(
            DiagnosticSeverity.Error,
            algPositionTransformer(error.token.start, error.token.end),
            error.message,
            DiagnosticCode.invalidAlg
        );
        diagnostics.push(diagnostic);
        return diagnostics;
    }
    const visitor = new AlgVisitor(true);
    visitor.visit(expr);
    visitor.calcs.forEach((calc) => {
        diagnostics.push(
            ...validateCalc(calc, refProvider, algPositionTransformer)
        );
    });
    visitor.variables.forEach((variable) => {
        diagnostics.push(
            ...validateAlgVariable(
                variable,
                doc,
                refProvider,
                offsetStartAlg
            )
        );
    });
    return diagnostics;
}

export function validateAlgVariable(
    variable: AlgLiteral,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider,
    offsetStartAlg: number
): Diagnostic[] {
    if (isPureJinja(variable.value)) {
        return [];
    }
    const variableParts = variable.value.split(".");
    if (
        !refProvider.validateRef(variableParts[0], defaultRefValidationFunction)
    ) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Warning,
                {
                    start: doc.positionAt(offsetStartAlg + variable.start),
                    end: doc.positionAt(offsetStartAlg + variable.end),
                },
                `Reference to undefined variable: ${variable.value}`,
                DiagnosticCode.missingReference
            ),
        ];
    }
    if (variableParts.length === 1) {
        return [];
    }
    if (variableParts[1] === "") {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(offsetStartAlg + variable.end - 1),
                    end: doc.positionAt(offsetStartAlg + variable.end),
                },
                `Missing public property for variable`,
                DiagnosticCode.missingPublicProperty
            ),
        ];
    }
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let referencedObjects = refProvider.getObjectsByIdentifier(
        variableParts[0]
    );
    referencedObjects = referencedObjects.filter((obj) => obj.isXvr);
    if (!referencedObjects.length) {
        return [];
    }
    const publicAttributes = metaInfoProvider.getObjectDocumentation(
        referencedObjects[0].type
    )?.publicAttributes;

    if (!publicAttributes?.includes(variableParts[1])) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(
                        offsetStartAlg +
                        variable.start +
                        variableParts[0].length +
                        1
                    ),
                    end: doc.positionAt(offsetStartAlg + variable.end),
                },
                `Unknown public property ${variableParts[1]} for ${referencedObjects[0].type}'`,
                DiagnosticCode.unknownPublicProperty
            ),
        ];
    }

    return [];
}

export function validateCalc(
    calc: AlgCalc,
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: Diagnostic[] = [];
    const calcMetaInfo = metaInfoProvider.getCalc(calc.identifier);
    if (!calcMetaInfo) {
        const diagnostic = createDiagnostic(
            DiagnosticSeverity.Warning,
            algPositionTransformer(calc.start, calc.end),
            `Unknown function: ${calc.identifier}`,
            DiagnosticCode.unknownCalc
        );
        return [diagnostic];
    }
    diagnostics.push(
        ...validateCalcParams(
            calc,
            calcMetaInfo,
            refProvider,
            algPositionTransformer
        )
    );
    return diagnostics;
}

function validateCalcParams(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (let index = 0; index < calc.getNumParams(); index++) {
        const paramExpr = calc.params[index];
        const calcParamIndex = fromCalcIndexToParamIndex(calc, calcInfo, index);
        const paramInfo = calcInfo.parameters[calcParamIndex];
        if (!paramInfo) {
            continue;
        }
        diagnostics.push(...validateSingleParam(paramExpr, paramInfo, refProvider, algPositionTransformer));
    }
    diagnostics.push(...validateCalcParamsLength(calc, calcInfo, algPositionTransformer));
    return diagnostics;
}

function validateSingleParam(
    paramExpr: AlgExpr,
    paramInfo: SepticCalcParameterInfo,
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (isEmptyNonOptionalParam(paramExpr, paramInfo)) {
        diagnostics.push(
            createDiagnostic(
                DiagnosticSeverity.Warning,
                algPositionTransformer(paramExpr.start, paramExpr.end),
                `Missing value for non-optional parameter`,
                DiagnosticCode.missingValueNonOptionalArg
            )
        );
    }
    diagnostics.push(...validateParamType(paramExpr, paramInfo.datatype, refProvider, algPositionTransformer));
    return diagnostics;
}

function validateCalcParamsLength(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    const paramInfo = getCalcParamIndexInfo(calcInfo);
    const numFixedParamsPre = paramInfo.fixedLengthParams.pre.length
        ? paramInfo.fixedLengthParams.pre[paramInfo.fixedLengthParams.pre.length - 1]
        : 0;
    const numFixedParamsPost = paramInfo.fixedLengthParams.post.length ? paramInfo.fixedLengthParams.post[paramInfo.fixedLengthParams.post.length - 1] - numFixedParamsPre : 0;
    const numVariableParams = paramInfo.variableLengthParams.num;
    const numParams = calc.getNumParams();
    if (!numVariableParams) {
        if (numParams < numFixedParamsPre - paramInfo.fixedLengthParams.numOptional) {
            return [
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Missing parameter(s). Expected min ${numFixedParamsPre - paramInfo.fixedLengthParams.numOptional
                    } params but got ${numParams}`,
                    DiagnosticCode.invalidNumberOfParams
                ),
            ];
        }
        if (numParams > numFixedParamsPre) {
            return [
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Too many parameters. Expected max ${numFixedParamsPre} params but got ${numParams}`,
                    DiagnosticCode.invalidNumberOfParams
                ),
            ];
        }
        return [];
    }
    if (paramInfo.variableLengthParams.exactLength) {
        const indexDesignatorParam = getIndexOfParam(
            paramInfo.variableLengthParams.exactLength,
            calcInfo
        );
        if (!indexDesignatorParam) {
            return [];
        }
        if (indexDesignatorParam >= calc.params.length) {
            return [];
        }
        const designatorValue = getValueOfAlgExpr(
            calc.params[indexDesignatorParam]
        );
        if (designatorValue === undefined) {
            return [];
        }
        const expectedNumParams =
            numVariableParams * designatorValue + numFixedParamsPre + numFixedParamsPost;
        if (numParams !== expectedNumParams) {
            return [
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    algPositionTransformer(calc.start, calc.end),
                    `Invalid number of parameters. Expected ${expectedNumParams} params but got ${numParams}`,
                    DiagnosticCode.invalidNumberOfParams
                ),
            ];
        }
        return [];
    }

    if (
        (numParams - numFixedParamsPre - numFixedParamsPost) % numVariableParams !== 0 ||
        numParams === 0 || numParams < numFixedParamsPre + numFixedParamsPost + numVariableParams
    ) {
        const minNumParams = numFixedParamsPre + numFixedParamsPost + numVariableParams;
        const oddOrEven = (numVariableParams + numFixedParamsPre + numFixedParamsPost) % 2 === 0 ? "even" : "odd";
        return [
            createDiagnostic(
                DiagnosticSeverity.Warning,
                algPositionTransformer(calc.start, calc.end),
                `Invalid number of parameters. Expected min ${minNumParams} parameters and an ${oddOrEven} number of parameters but got ${numParams}`,
                DiagnosticCode.invalidNumberOfParams
            ),
        ];
    }
    return [];
}

function isEmptyNonOptionalParam(
    expr: AlgExpr,
    paramInfo: SepticCalcParameterInfo
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
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    if (types[0] === VALUE) {
        return validateValueParamType(expr, refProvider, algPositionTransformer);
    }
    return validateObjectParamType(expr, types, refProvider, algPositionTransformer);
}

function validateObjectParamType(
    expr: AlgExpr,
    types: string[],
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    if (!isAlgExprObjectReference(expr)) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Warning,
                algPositionTransformer(expr.start, expr.end),
                `Wrong data type for parameter. Expected data type for parameter: ${types.join(",")}}`,
                DiagnosticCode.invalidDataTypeArg
            )
        ];
    }
    const exprLiteral = expr as AlgLiteral;
    const objects = refProvider.getObjectsByIdentifier(
        exprLiteral.value.split(".")[0]
    );
    for (const obj of objects) {
        if (obj.isType(...types)) {
            return [];
        }
    }
    return [
        createDiagnostic(
            DiagnosticSeverity.Warning,
            algPositionTransformer(expr.start, expr.end),
            `Wrong data type for parameter: ${exprLiteral.value}. Expected data type for parameter: ${types.join(",")}}`,
            DiagnosticCode.invalidDataTypeArg
        )
    ];
}

function validateValueParamType(
    expr: AlgExpr,
    refProvider: SepticReferenceProvider,
    algPositionTransformer: AlgPositionTransformer
): Diagnostic[] {
    if (!isAlgExprObjectReference(expr)) {
        return [];
    }
    const exprLiteral = expr as AlgLiteral;
    if (isPureJinja(exprLiteral.value)) {
        return [];
    }
    if (refProvider.validateRef(exprLiteral.value, defaultRefValidationFunction)) {
        return [];
    }
    return [createDiagnostic(
        DiagnosticSeverity.Warning,
        algPositionTransformer(expr.start, expr.end),
        `Reference to undefined variable: ${exprLiteral.value}`,
        DiagnosticCode.missingReference)];
}

function isAlgExprObjectReference(expr: AlgExpr) {
    return expr instanceof AlgLiteral && expr.type === AlgTokenType.identifier;
}

export function validateObjects(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: Diagnostic[] = [];
    for (const obj of cnfg.objects) {
        const objectDoc = metaInfoProvider.getObjectDocumentation(obj.type);
        const objectInfo = metaInfoProvider.getObject(obj.type);
        if (!objectDoc) {
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(obj.start),
                        end: doc.positionAt(obj.start + obj.type.length),
                    },
                    "Unknown object type",
                    DiagnosticCode.unknownObjectType
                )
            );
            continue;
        }
        diagnostics.push(
            ...validateObject(obj, doc, refProvider, objectDoc, objectInfo)
        );
    }
    return diagnostics;
}

export function validateObject(
    obj: SepticObject,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider,
    objectDoc: ISepticObjectDocumentation,
    objectInfo: SepticObjectInfo | undefined
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...validateObjectParent(obj, doc));
    diagnostics.push(...validateIdentifier(obj, doc));
    diagnostics.push(
        ...validateObjectReferences(obj, doc, refProvider, objectInfo)
    );
    for (const attr of obj.attributes) {
        diagnostics.push(...validateAttribute(attr, doc, objectDoc));
    }
    return diagnostics;
}

export function validateIdentifier(
    obj: SepticObject,
    doc: ITextDocument
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (!obj.identifier) {
        const diagnostic: Diagnostic = createDiagnostic(
            DiagnosticSeverity.Error,
            {
                start: doc.positionAt(obj.start),
                end: doc.positionAt(obj.start + obj.type.length),
            },
            `Missing identifier for object of type ${obj.type}`,
            DiagnosticCode.missingIdentifier
        );
        diagnostics.push(diagnostic);
        return diagnostics;
    }

    if (checkIdentifier(obj.identifier.name)) {
        return [];
    }

    return [
        createDiagnostic(
            DiagnosticSeverity.Error,
            {
                start: doc.positionAt(obj.identifier.start),
                end: doc.positionAt(obj.identifier.end),
            },
            `Invalid identifier. Identifier needs to contain minimum one letter. Allowed chars: [a-z, A-Z, 0-9, _, -]. Jinja-expressions are allowed for SCG`,
            DiagnosticCode.invalidIdentifier
        ),
    ];
}

export function validateObjectReferences(
    obj: SepticObject,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider,
    objectMetaInfo: SepticObjectInfo | undefined
): Diagnostic[] {
    if (!objectMetaInfo) {
        return [];
    }
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...validateDuplicateIdentifiers(obj, refProvider, doc));
    if (obj.isType("Evr")) {
        diagnostics.push(...validateEvrReferences(obj, refProvider, doc));
    }
    if (shouldValidateIdentifier(objectMetaInfo, obj)) {
        if (obj.isType("CalcPvr")) {
            diagnostics.push(
                ...validateCalcPvrIdentifierReferences(obj, refProvider, doc)
            );
        } else if (obj.isType("UAAppl")) {
            diagnostics.push(
                ...validateUAApplReferences(obj, refProvider, doc)
            );
        } else {
            diagnostics.push(
                ...validateIdentifierReferences(
                    obj,
                    refProvider,
                    objectMetaInfo,
                    doc
                )
            );
        }
    }
    for (const attr of objectMetaInfo.refs.attributes) {
        let attrValues = obj.getAttribute(attr)?.getAttrValues();
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
            const validRef = refProvider.validateRef(
                refName,
                defaultRefValidationFunction
            );
            if (validRef) {
                continue;
            }
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    {
                        start: doc.positionAt(attrValue.start),
                        end: doc.positionAt(attrValue.end),
                    },
                    `Reference to undefined Xvr ${attrValue.getValue()}`,
                    DiagnosticCode.missingReference
                )
            );
        }
    }
    return diagnostics;
}

function shouldValidateIdentifier(
    objectMetaInfo: SepticObjectInfo,
    obj: SepticObject
) {
    return objectMetaInfo.refs.identifier && obj.identifier && !obj.isXvr;
}

function validateIdentifierReferences(
    obj: SepticObject,
    refProvider: SepticReferenceProvider,
    objectMetaInfo: SepticObjectInfo,
    doc: ITextDocument
): Diagnostic[] {
    const validRef = refProvider.validateRef(
        obj.identifier!.name,
        defaultRefValidationFunction
    );
    if (validRef) {
        return [];
    }
    const severity = objectMetaInfo.refs.identifierOptional
        ? DiagnosticSeverity.Hint
        : DiagnosticSeverity.Warning;
    return [
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            `Reference to undefined Xvr ${obj.identifier!.name}`,
            DiagnosticCode.missingReference
        ),
    ];
}

const hasDuplicateReferenceXvr: RefValidationFunction = (
    refs: SepticReference[]
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
    refs: SepticReference[]
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
    refs: SepticReference[]
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
    refProvider: SepticReferenceProvider,
    doc: ITextDocument
): Diagnostic[] {
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
    const validRef = refProvider.validateRef(
        obj.identifier!.name,
        validationFunction
    );
    if (validRef) {
        return [];
    }
    const severity = DiagnosticSeverity.Warning;
    return [
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            `Duplicate Xvr with name: ${obj.identifier!.name}`,
            DiagnosticCode.duplicate
        ),
    ];
}

function validateCalcPvrIdentifierReferences(
    obj: SepticObject,
    refProvider: SepticReferenceProvider,
    doc: ITextDocument
): Diagnostic[] {
    const referenceToEvr = refProvider.validateRef(
        obj.identifier!.name,
        hasReferenceToEvr
    );
    if (referenceToEvr) {
        return [];
    }
    const referenceToXvr = refProvider.validateRef(
        obj.identifier!.name,
        defaultRefValidationFunction
    );
    const severity = referenceToXvr
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Hint;
    const message = referenceToXvr
        ? `CalcPvr references non Evr ${obj.identifier!.name}`
        : `No reference to Evr`;
    const code = referenceToXvr
        ? DiagnosticCode.invalidReference
        : DiagnosticCode.missingReference;
    return [
        createDiagnostic(
            severity,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            message,
            code
        ),
    ];
}

function validateUAApplReferences(
    obj: SepticObject,
    refProvider: SepticReferenceProvider,
    doc: ITextDocument
): Diagnostic[] {
    for (const object of refProvider.getObjectsByIdentifier(
        obj.identifier!.name
    )) {
        if (object.isType("SmpcAppl", "MPCAppl")) {
            return [];
        }
    }
    return [
        createDiagnostic(
            DiagnosticSeverity.Warning,
            {
                start: doc.positionAt(obj.identifier!.start),
                end: doc.positionAt(obj.identifier!.end),
            },
            "Missing reference to SmpcAppl or MPCAppl",
            DiagnosticCode.missingReference
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

export function validateEvrReferences(
    obj: SepticObject,
    refProvider: SepticReferenceProvider,
    doc: ITextDocument
) {
    const userInputAttrValue = obj.getAttribute("UserInput")?.getAttrValue();
    if (userInputAttrValue && userInputAttrValue.getValue() !== "OFF") {
        return [];
    }
    const name = obj.identifier?.name;
    if (!name) {
        return [];
    }
    const refs = refProvider.getXvrRefs(name);
    const calcPvrRef = refs?.find((ref) => {
        return ref.type === ReferenceType.calc;
    });
    if (!calcPvrRef) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Warning,
                {
                    start: doc.positionAt(obj.identifier!.start),
                    end: doc.positionAt(obj.identifier!.end),
                },
                "Unused Evr. Evr not used in calcs or enabled user input",
                DiagnosticCode.unusedEvr
            ),
        ];
    }
    return [];
}

export function validateAttribute(
    attr: Attribute,
    doc: ITextDocument,
    objectDoc: ISepticObjectDocumentation
): Diagnostic[] {
    const attrDoc = objectDoc.getAttribute(attr.key);
    const diagnostics: Diagnostic[] = [];
    if (!attrDoc) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
                `Unknown attribute for Object of type ${objectDoc.name}`,
                DiagnosticCode.unknownAttribute
            ),
        ];
    }
    const attrValues = attr.getAttrValues();
    diagnostics.push(
        ...validateAttributeNumValues(
            attrValues,
            attrDoc,
            attr.start,
            attr.start + attr.key.length,
            doc
        )
    );
    const startIndex = attrValues.length > 1 ? 1 : 0;
    diagnostics.push(
        ...validateAttributeValue(attrValues.slice(startIndex), attrDoc, doc)
    );
    return diagnostics;
}

function validateAttributeValue(
    attrValues: AttributeValue[],
    attrDoc: SepticAttributeDocumentation,
    doc: ITextDocument
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const attrValue of attrValues) {
        if (!checkAttributeDataType(attrValue, attrDoc)) {
            const datatypeFormatted = formatDataType(attrDoc);
            const errorMessage = `Wrong data type for attribute. Expected DataType: ${datatypeFormatted}`;
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(attrValue.start),
                        end: doc.positionAt(attrValue.end),
                    },
                    errorMessage,
                    DiagnosticCode.invalidDataTypeAttribute
                )
            );
        }
        if (attrValue.type === SepticTokenType.string) {
            const indexInvalid = attrValue.getValue().indexOf("'");
            if (indexInvalid !== -1) {
                diagnostics.push(
                    createDiagnostic(
                        DiagnosticSeverity.Error,
                        {
                            start: doc.positionAt(
                                attrValue.start + 1 + indexInvalid
                            ),
                            end: doc.positionAt(
                                attrValue.start + 1 + indexInvalid + 1
                            ),
                        },
                        `Invalid char in string: "'" `,
                        DiagnosticCode.invalidCharInString
                    )
                );
            }
        }
    }
    return diagnostics;
}

function validateAttributeNumValues(
    attrValues: AttributeValue[],
    attrDoc: SepticAttributeDocumentation,
    startAttr: number,
    endAttr: number,
    doc: ITextDocument
): Diagnostic[] {
    const range = {
        start: doc.positionAt(startAttr),
        end: doc.positionAt(endAttr),
    };
    switch (attrValues.length) {
        case 0:
            return [
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    range,
                    `Missing value for attribute`,
                    DiagnosticCode.missingAttributeValue
                ),
            ];
        case 1:
            if (!attrDoc.list) {
                return [];
            }
            return [
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    range,
                    `Attribute expects list of values`,
                    DiagnosticCode.missingListAttribute
                ),
            ];
        default:
            {
                if (!attrDoc.list) {
                    return [
                        createDiagnostic(
                            DiagnosticSeverity.Error,
                            range,
                            `Attribute does not expect list of values`,
                            DiagnosticCode.unexpectedList
                        ),
                    ];
                }
                if (!isInt(attrValues[0].value)) {
                    return [
                        createDiagnostic(
                            DiagnosticSeverity.Error,
                            range,
                            `First value needs to be positive int when multiple values are provided for attribute`,
                            DiagnosticCode.missingListLengthValue
                        ),
                    ];
                }
                const numValues = parseInt(attrValues[0].value);
                if (attrValues.length - 1 !== numValues) {
                    return [
                        createDiagnostic(
                            DiagnosticSeverity.Error,
                            range,
                            `Incorrect number of values given. Expected: ${numValues} Actual: ${attrValues.length - 1
                            }.`,
                            DiagnosticCode.mismatchLengthList
                        ),
                    ];
                }
                return [];
            }
    }
}

export function validateObjectParent(
    obj: SepticObject,
    doc: ITextDocument
): Diagnostic[] {
    const objectHierarchy =
        SepticMetaInfoProvider.getInstance().getObjectHierarchy();
    const expectedParents = objectHierarchy.nodes.get(obj.type)?.parents ?? [];
    if (expectedParents.length && !obj.parent) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `No parent object for object. Expected parent object of type: ${expectedParents}`,
                DiagnosticCode.missingParentObject
            ),
        ];
    }
    const parent = obj.parent?.type ?? "";
    if (expectedParents.length && !expectedParents.includes(parent)) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `Invalid parent object of type ${parent}. Expected parent object of type: ${expectedParents}`,
                DiagnosticCode.invalidParentObject
            ),
        ];
    }
    return [];
}

export function checkAttributeDataType(
    attrValue: AttributeValue,
    attrDoc: SepticAttributeDocumentation
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
        default:
            {
                const bitMaskMatch = attrDoc.dataType.match(/^bit([0-9]+)$/);
                if (!bitMaskMatch) {
                    return true;
                }
                const number = parseInt(bitMaskMatch[1]);
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
    doc: ITextDocument
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
