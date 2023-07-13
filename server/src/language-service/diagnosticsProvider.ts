/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
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
    calcNumParameterInfo,
    arityToNum,
    ISepticObjectDocumentation,
    AttributeValue,
    SepticAttributeDocumentation,
    SepticTokenType,
    SepticObjectInfo,
} from "../septic";
import { SettingsManager } from "../settings";
import { isPureJinja } from "../util";

export const disableDiagnosticRegex =
    /\/\/\s+noqa\b(?::([ \w,]*))?|\{#\s+noqa\b(?::([ \w,]*))?\s*#\}/i;
export const diagnosticCodeRegex = /(E|W)[0-9]{3}/;

export enum DiagnosticCode {
    invalidIdentifier = "E101",
    unknownObjectType = "E102",
    invalidAlg = "E201",
    unknownCalc = "E202",
    invalidDataTypeParam = "E203",
    invalidNumberOfParams = "E204",
    missingValueNonOptionalParam = "E205",
    missingListLengthValue = "E301",
    mismatchLengthList = "E302",
    missingAttributeValue = "E304",
    unknownAttribute = "E305",
    missingListAttribute = "E306",
    invalidDataTypeAttribute = "E307",
    unexpectedList = "E308",
    missingReference = "W101",
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

type NumberParamConditions = (n: number) => {
    condition: boolean;
    message: string;
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
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideDiagnostics(
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<Diagnostic[]> {
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (cnfg === undefined) {
            return [];
        }

        let settingsWorkspace = await this.settingsManager.getSettings();
        let settings =
            settingsWorkspace?.diagnostics ?? defaultDiagnosticsSettings;

        if (!settings.enabled) {
            return [];
        }
        await refProvider.load();
        return getDiagnostics(cnfg, doc, refProvider);
    }
}

export function getDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
) {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...validateObjects(cnfg, doc, refProvider));
    diagnostics.push(...validateAlgs(cnfg, doc, refProvider));
    let disabledLines = getDisabledLines(cnfg.comments, doc);
    let filteredDiags = diagnostics.filter((diag) => {
        let disabledLine = disabledLines.get(diag.range.start.line);
        if (!disabledLine) {
            return true;
        }
        if (disabledLine.all) {
            return false;
        }
        for (let code of disabledLine.diagnosticCodes) {
            if (code === diag.code) {
                return false;
            }
        }
        return true;
    });
    return filteredDiags;
}

export function validateAlgs(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    let algAttrs = cnfg.getAlgAttrs();

    for (let i = 0; i < algAttrs.length; i++) {
        let algAttrValue = algAttrs[i].getAttrValue();
        if (!algAttrValue) {
            continue;
        }
        const offsetStartAlg = algAttrValue.start + 1;
        let expr;
        try {
            expr = parseAlg(algAttrValue.getValue());
        } catch (error: any) {
            const diagnostic = createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(offsetStartAlg + error.token.start),
                    end: doc.positionAt(algAttrValue.end),
                },
                error.message,
                DiagnosticCode.invalidAlg
            );
            diagnostics.push(diagnostic);
            continue;
        }
        const visitor = new AlgVisitor();
        visitor.visit(expr);

        visitor.calcs.forEach((calc) => {
            diagnostics.push(
                ...validateCalc(calc, doc, refProvider, offsetStartAlg)
            );
        });

        for (let variable of visitor.variables) {
            if (isPureJinja(variable.value)) {
                continue;
            }
            if (
                !refProvider.validateRef(
                    variable.value.split(".")[0],
                    defaultRefValidationFunction
                )
            ) {
                const diagnostic = createDiagnostic(
                    DiagnosticSeverity.Warning,
                    {
                        start: doc.positionAt(offsetStartAlg + variable.start),
                        end: doc.positionAt(offsetStartAlg + variable.end),
                    },
                    `Undefined Xvr '${variable.value}'`,
                    DiagnosticCode.missingReference
                );
                diagnostics.push(diagnostic);
            }
        }
    }
    return diagnostics;
}

export function validateCalc(
    calc: AlgCalc,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider,
    offsetStartAlg: number
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: Diagnostic[] = [];
    const calcMetaInfo = metaInfoProvider.getCalc(calc.identifier);
    if (!calcMetaInfo) {
        const diagnostic = createDiagnostic(
            DiagnosticSeverity.Error,
            {
                start: doc.positionAt(offsetStartAlg + calc.start),
                end: doc.positionAt(offsetStartAlg + calc.end),
            },
            `Calc with unknown identifier: ${calc.identifier}`,
            DiagnosticCode.unknownCalc
        );
        return [diagnostic];
    }
    diagnostics.push(
        ...validateCalcParams(
            calc,
            calcMetaInfo,
            refProvider,
            doc,
            offsetStartAlg
        )
    );
    diagnostics.push(
        ...validateCalcParamNumber(calc, calcMetaInfo, doc, offsetStartAlg)
    );
    return diagnostics;
}

function validateCalcParams(
    calc: AlgCalc,
    calcMetaInfo: SepticCalcInfo,
    refProvider: SepticReferenceProvider,
    doc: ITextDocument,
    offsetStartAlg: number
): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    let indexCalcParams = 0;
    let indexParamInfo = 0;
    for (let param of calcMetaInfo.parameters) {
        if (indexCalcParams >= calc.params.length) {
            break;
        }

        indexParamInfo += arityToNum(param.arity);
        while (
            indexCalcParams < indexParamInfo &&
            indexCalcParams < calc.params.length
        ) {
            if (
                param.arity !== "optional" &&
                calc.params[indexCalcParams] instanceof AlgLiteral
            ) {
                let paramCalc = calc.params[indexCalcParams] as AlgLiteral;
                if (!paramCalc.value.length) {
                    diagnostics.push(
                        createDiagnostic(
                            DiagnosticSeverity.Error,
                            {
                                start: doc.positionAt(
                                    offsetStartAlg +
                                        calc.params[indexCalcParams].start
                                ),
                                end: doc.positionAt(
                                    offsetStartAlg +
                                        calc.params[indexCalcParams].end
                                ),
                            },
                            `Missing value for non-optional parameter`,
                            DiagnosticCode.missingValueNonOptionalParam
                        )
                    );
                }
            }
            if (param.type === "Value") {
                indexCalcParams += 1;
                continue;
            }
            if (
                checkParamType(
                    calc.params[indexCalcParams],
                    [param.type],
                    refProvider
                )
            ) {
                indexCalcParams += 1;
                continue;
            }
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(
                            offsetStartAlg + calc.params[indexCalcParams].start
                        ),
                        end: doc.positionAt(
                            offsetStartAlg + calc.params[indexCalcParams].end
                        ),
                    },
                    `Wrong data type for parameter. Expected data type: ${param.type}`,
                    DiagnosticCode.invalidDataTypeParam
                )
            );
            indexCalcParams += 1;
        }
    }
    return diagnostics;
}

function validateCalcParamNumber(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    doc: ITextDocument,
    offsetStartAlg: number
): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    let numberParamsConditions: NumberParamConditions[] =
        getNumberOfParamsConditions(calcInfo);
    let numberParamsCalc = calc.params.length;
    numberParamsConditions.forEach((cond) => {
        let condEval = cond(numberParamsCalc);
        if (!condEval.condition) {
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(offsetStartAlg + calc.start),
                        end: doc.positionAt(offsetStartAlg + calc.end),
                    },
                    `${condEval.message}`,
                    DiagnosticCode.invalidNumberOfParams
                )
            );
        }
    });
    return diagnostics;
}

function getNumberOfParamsConditions(
    calcInfo: SepticCalcInfo
): NumberParamConditions[] {
    let numParamInfo = calcNumParameterInfo(calcInfo);
    let conditions: NumberParamConditions[] = [];
    if (
        numParamInfo.maxActive &&
        numParamInfo.minNumber === numParamInfo.maxNumber
    ) {
        let conditionExactNumbers: NumberParamConditions = (n: number) => {
            return {
                condition: n === numParamInfo.minNumber,
                message: `Expected number of arguments to equal ${numParamInfo.minNumber}`,
            };
        };
        conditions.push(conditionExactNumbers);
    } else if (numParamInfo.maxActive) {
        let conditionBetween: NumberParamConditions = (n: number) => {
            return {
                condition:
                    n >= numParamInfo.minNumber && n <= numParamInfo.maxNumber,
                message: `Expected number of arguments to be between ${numParamInfo.minNumber} and ${numParamInfo.maxNumber}`,
            };
        };
        conditions.push(conditionBetween);
    } else {
        let conditionMoreThan: NumberParamConditions = (n: number) => {
            return {
                condition: n >= numParamInfo.minNumber,
                message: `Expected number of arguments to be >= ${numParamInfo.minNumber}`,
            };
        };
        conditions.push(conditionMoreThan);
    }

    if (numParamInfo.parityActive && !numParamInfo.maxActive) {
        let parityBit = numParamInfo.minNumber % 2;
        let evenOrOdd = parityBit ? "odd" : "even";
        let conditionParity: NumberParamConditions = (n: number) => {
            return {
                condition: n % 2 === parityBit,
                message: `Expected number of arguments to be ${evenOrOdd}`,
            };
        };
        conditions.push(conditionParity);
    }
    return conditions;
}

function checkParamType(
    param: AlgExpr,
    type: string[],
    refProvider: SepticReferenceProvider
): boolean {
    if (!(param instanceof AlgLiteral)) {
        return false;
    }
    if (param.type !== AlgTokenType.identifier) {
        return false;
    }
    let objects = refProvider.getObjectsByIdentifier(param.value);
    for (let obj of objects) {
        if (obj.isType(...type)) {
            return true;
        }
    }
    return false;
}

export function validateObjects(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let diagnostics: Diagnostic[] = [];
    for (let obj of cnfg.objects) {
        const objectDoc = metaInfoProvider.getObjectDocumentation(obj.type);
        const objectInfo = metaInfoProvider.getObject(obj.type);
        if (!objectDoc || !objectInfo) {
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
    objectInfo: SepticObjectInfo
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...validateIdentifier(obj, doc));
    diagnostics.push(
        ...validateObjectReferences(obj, doc, refProvider, objectInfo)
    );
    for (let attr of obj.attributes) {
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
            DiagnosticCode.invalidIdentifier
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
    objectMetaInfo: SepticObjectInfo
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (objectMetaInfo.refs.identifier && obj.identifier && !obj.isXvr()) {
        let validRef = refProvider.validateRef(
            obj.identifier.name,
            defaultRefValidationFunction
        );
        if (!validRef) {
            diagnostics.push(
                createDiagnostic(
                    objectMetaInfo.refs.identifierOptional
                        ? DiagnosticSeverity.Hint
                        : DiagnosticSeverity.Warning,
                    {
                        start: doc.positionAt(obj.identifier.start),
                        end: doc.positionAt(obj.identifier.end),
                    },
                    `Reference to undefined Xvr ${obj.identifier.name}`,
                    DiagnosticCode.missingReference
                )
            );
        }
    }

    for (let attrRefs of objectMetaInfo.refs.attr) {
        let attr = obj.getAttribute(attrRefs);
        if (!attr) {
            continue;
        }
        let validRef = refProvider.validateRef(
            attr.getValue() ?? "",
            defaultRefValidationFunction
        );
        if (!validRef) {
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    {
                        start: doc.positionAt(attr.start),
                        end: doc.positionAt(attr.start + attr.key.length),
                    },
                    `Reference to undefined Xvr ${attr.key}`,
                    DiagnosticCode.missingReference
                )
            );
        }
    }

    for (let attrRefsList of objectMetaInfo.refs.attrList) {
        let attrValues = obj.getAttribute(attrRefsList)?.getAttrValues();
        if (!attrValues || attrValues.length < 2) {
            continue;
        }
        for (let attrValue of attrValues.slice(1)) {
            if (attrValue.getValue().trim() === "") {
                continue;
            }
            let validRef = refProvider.validateRef(
                attrValue.getValue(),
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

function validateAttribute(
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
    let attrValues = attr.getAttrValues();
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
        ...validateAttributeDataType(attrValues.slice(startIndex), attrDoc, doc)
    );
    return diagnostics;
}

function validateAttributeDataType(
    attrValues: AttributeValue[],
    attrDoc: SepticAttributeDocumentation,
    doc: ITextDocument
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (let attrValue of attrValues) {
        if (!checkAttributeDataType(attrValue, attrDoc)) {
            let errorMessage = `Wrong data type for attribute. Expected DataType: ${attrDoc.dataType}`;
            if (attrDoc.dataType === "Enum") {
                errorMessage += `. Permissable enums: ${attrDoc.enums.join(
                    "|"
                )}`;
            }
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
                    `Attribute don't expect list of values`,
                    DiagnosticCode.missingListAttribute
                ),
            ];
        default:
            if (!attrDoc.list) {
                return [
                    createDiagnostic(
                        DiagnosticSeverity.Error,
                        range,
                        `Attribute don't expect list of values`,
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
            let numValues = parseInt(attrValues[0].value);
            if (attrValues.length - 1 !== numValues) {
                return [
                    createDiagnostic(
                        DiagnosticSeverity.Error,
                        range,
                        `Incorrect number of values given. Expected: ${numValues} Actual: ${
                            attrValues.length - 1
                        }.`,
                        DiagnosticCode.mismatchLengthList
                    ),
                ];
            }
            return [];
    }
}

export function checkAttributeDataType(
    attrValue: AttributeValue,
    attrDoc: SepticAttributeDocumentation
): boolean {
    if (attrValue.type === SepticTokenType.jinjaExpression) {
        return true;
    }
    switch (attrDoc.dataType) {
        case "Int":
            return isInt(attrValue.value);
        case "Double":
            return attrValue.type === SepticTokenType.numeric;
        case "String":
            return attrValue.type === SepticTokenType.string;
        case "Enum":
            return attrDoc.enums.includes(attrValue.value);
        default:
            let bitMaskMatch = attrDoc.dataType.match(/^Bit([0-9]+)$/);
            if (!bitMaskMatch) {
                return true;
            }
            let number = parseInt(bitMaskMatch[1]);
            return RegExp(`[01]{${number}}`).test(attrValue.value);
    }
}

function isInt(str: string) {
    return /^-?[0-9]+$/.test(str);
}

export function checkIdentifier(identifier: string): boolean {
    const ignoredPattern = /\{\{\s*[\w\-]+\s*\}\}/g;

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
    let disabledLinesMap = new Map<
        number,
        { all: boolean; diagnosticCodes: string[] }
    >();
    for (let comment of comments) {
        let match = comment.content.match(disableDiagnosticRegex);
        if (!match) {
            continue;
        }
        let line = doc.positionAt(comment.start).line;
        let matchCode = match[1] ?? match[2];
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
    let splitCodes = codes.split(",");
    let diagnosticCodes: string[] = [];
    splitCodes.forEach((code) => {
        let trimedCode = code.trim();
        if (diagnosticCodeRegex.test(trimedCode)) {
            diagnosticCodes.push(trimedCode);
        }
    });
    return diagnosticCodes;
}
