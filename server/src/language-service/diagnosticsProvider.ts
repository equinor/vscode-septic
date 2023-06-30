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
    AlgParsingError,
    AlgParsingErrorType,
    SepticComment,
    Attribute,
    SepticObject,
    defaultRefValidationFunction,
} from "../septic";
import { SettingsManager } from "../settings";
import { isPureJinja } from "../util";

export const disableDiagnosticRegex =
    /\/\/\s+noqa\b(?::([ \w,]*))?|\{#\s+noqa\b(?::([ \w,]*))?\s*#\}/i;
export const diagnosticCodeRegex = /(E|W)[0-9]{3}/;

export enum DiagnosticCode {
    E101 = "E101", // Identifier
    E201 = "E201", // Unable to parse alg
    E202 = "E202", // Unknown calc in alg
    E301 = "E301", // Missing list length
    E302 = "E302", // Mismatch length of list
    E303 = "E303", // Unknown object type
    E304 = "E304", // Missing attribute
    W101 = "W101", // Missing reference
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
    private readonly settingsManager: SettingsManager;

    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

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
    diagnostics.push(...objDiagnostics(cnfg, doc, refProvider));
    diagnostics.push(...algDiagnostic(cnfg, doc, refProvider));
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

export function identifierDiagnostics(
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
            DiagnosticCode.E101
        );
        diagnostics.push(diagnostic);
        return diagnostics;
    }

    let report = validateIdentifier(obj.identifier.name);
    if (report.valid) {
        return [];
    }

    if (!report.containsLetter) {
        const diagnostic: Diagnostic = createDiagnostic(
            DiagnosticSeverity.Error,
            {
                start: doc.positionAt(obj.identifier.start),
                end: doc.positionAt(obj.identifier.end),
            },
            `Identifier needs to contain minimum one letter`,
            DiagnosticCode.E101
        );
        diagnostics.push(diagnostic);
    }

    if (report.invalidChars.length) {
        const diagnostic: Diagnostic = createDiagnostic(
            DiagnosticSeverity.Error,
            {
                start: doc.positionAt(obj.identifier.start),
                end: doc.positionAt(obj.identifier.end),
            },
            `Identifier contains the following invalid chars: ${report.invalidChars}`,
            DiagnosticCode.E101
        );
        diagnostics.push(diagnostic);
    }
    return diagnostics;
}

export function algDiagnostic(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const diagnostics: Diagnostic[] = [];
    let algAttrs = cnfg.getAlgAttrs();

    for (let i = 0; i < algAttrs.length; i++) {
        let algAttrValue = algAttrs[i].getAttrValue();
        if (!algAttrValue) {
            continue;
        }

        let expr;
        try {
            expr = parseAlg(algAttrValue.getValue() ?? "");
        } catch (error: any) {
            let severity: DiagnosticSeverity = DiagnosticSeverity.Error;
            if (
                error instanceof AlgParsingError &&
                error.type === AlgParsingErrorType.unsupportedJinja
            ) {
                severity = DiagnosticSeverity.Hint;
            }
            const diagnostic = createDiagnostic(
                severity,
                {
                    start: doc.positionAt(
                        algAttrValue.start + 1 + error.token.start
                    ),
                    end: doc.positionAt(algAttrValue.end),
                },
                error.message,
                DiagnosticCode.E201
            );
            diagnostics.push(diagnostic);
            continue;
        }
        const visitor = new AlgVisitor();
        visitor.visit(expr);

        visitor.calcs.forEach((calc) => {
            if (!metaInfoProvider.hasCalc(calc.identifier)) {
                const diagnostic = createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(
                            algAttrValue!.start + 1 + calc.start
                        ),
                        end: doc.positionAt(
                            algAttrValue!.start + 1 + calc.start
                        ),
                    },
                    `Calc with unknown indentifier: ${calc.identifier}`,
                    DiagnosticCode.E202
                );
                diagnostics.push(diagnostic);
            }
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
                        start: doc.positionAt(
                            algAttrValue.start + 1 + variable.start
                        ),
                        end: doc.positionAt(
                            algAttrValue.start + 1 + variable.end
                        ),
                    },
                    `Undefined Xvr '${variable.value}'`,
                    DiagnosticCode.W101
                );
                diagnostics.push(diagnostic);
            }
        }
    }
    return diagnostics;
}

export function objDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    for (let obj of cnfg.objects) {
        diagnostics.push(...identifierDiagnostics(obj, doc));
        diagnostics.push(...objRefDiagnostics(obj, doc, refProvider));
        for (let attr of obj.attributes) {
            diagnostics.push(...attrDiagnostics(attr, doc));
        }
    }
    return diagnostics;
}

function objRefDiagnostics(
    obj: SepticObject,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objectMetaInfo = metaInfoProvider.getObject(obj.type);
    if (!objectMetaInfo) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `Unknown object type ${obj.type}`,
                DiagnosticCode.E303
            ),
        ];
    }
    const diagnostics: Diagnostic[] = [];
    if (objectMetaInfo.refs.identifier && obj.identifier && !obj.isXvr()) {
        let validRef = refProvider.validateRef(
            obj.identifier.name,
            defaultRefValidationFunction
        );
        if (!validRef) {
            diagnostics.push(
                createDiagnostic(
                    DiagnosticSeverity.Warning,
                    {
                        start: doc.positionAt(obj.identifier.start),
                        end: doc.positionAt(obj.identifier.end),
                    },
                    `Reference to undefined Xvr ${obj.identifier.name}`,
                    DiagnosticCode.W101
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
                    DiagnosticCode.W101
                )
            );
        }
    }

    for (let attrRefsList of objectMetaInfo.refs.attrList) {
        let attrValues = obj.getAttribute(attrRefsList)?.getAttrValues();
        if (!attrValues || attrValues.length < 2) {
            continue;
        }
        for (let attrValue of attrValues.splice(1)) {
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
                    DiagnosticCode.W101
                )
            );
        }
    }
    return diagnostics;
}

function attrDiagnostics(attr: Attribute, doc: ITextDocument): Diagnostic[] {
    let attrValues = attr.getAttrValues();
    if (!attrValues.length) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
                `Missing value for attribute ${attr.key}`,
                DiagnosticCode.E304
            ),
        ];
    }

    if (attrValues.length === 1) {
        return [];
    }
    let numValues = parseInt(attrValues[0].value);
    if (isNaN(numValues)) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
                `First value needs to be int when multiple values are provided for attribute ${attr.key}`,
                DiagnosticCode.E301
            ),
        ];
    }

    if (numValues !== attrValues.length - 1) {
        return [
            createDiagnostic(
                DiagnosticSeverity.Error,
                {
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
                `Incorrect number of values given. Expected: ${numValues} Actual: ${
                    attrValues.length - 1
                }.`,
                DiagnosticCode.E302
            ),
        ];
    }
    return [];
}

interface IdentifierReport {
    containsLetter: boolean;
    invalidChars: string[];
    valid: boolean;
}

export function validateIdentifier(identifier: string): IdentifierReport {
    const ignoredPattern = /\{\{\s*[\w\-]+\s*\}\}/g;

    const filteredIdentifier = identifier.replace(ignoredPattern, "");

    const containsLetter =
        /[a-zA-Z]/.test(filteredIdentifier) ||
        filteredIdentifier.length < identifier.length;

    const invalidChars = getInvalidChars(filteredIdentifier);

    return {
        valid: containsLetter && !invalidChars.length,
        invalidChars: invalidChars,
        containsLetter: containsLetter,
    };
}

function getInvalidChars(str: string): string[] {
    const invalidCharsRegex = /[^a-zA-Z0-9_]/g;
    const invalidChars = str.match(invalidCharsRegex) || [];
    return [...new Set(invalidChars)];
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
