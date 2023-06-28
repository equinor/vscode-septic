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
    SepticReference,
    SepticMetaInfoProvider,
    parseAlg,
    SepticReferenceProvider,
    AlgParsingError,
    AlgParsingErrorType,
    SepticComment,
} from "../septic";
import { SettingsManager } from "../settings";

export const disableDiagnosticRegex =
    /\/\/\s+noqa\b(\s[\s\w,]+)?|\{#\s+noqa\b(\s[\s\w,]+)?\s*#\}/i;
export const diagnosticCodeRegex = /E[0-9]{3}/;

export enum DiagnosticCode {
    E101 = "E101", // Identifier
    E201 = "E201", // Unable to parse alg
    E202 = "E202", // Unknown xvr in alg
    E203 = "E203", // Unknown calc in alg
}

export enum DiagnosticLevel {
    error = "error",
    warning = "warning",
    hint = "hint",
    ignore = "ignore",
}

export interface DiagnosticsSettings {
    readonly enabled: boolean;
    readonly identifier: DiagnosticLevel | undefined;
    readonly alg: DiagnosticLevel | undefined;
    readonly algMissingReference: DiagnosticLevel | undefined;
    readonly algCalc: DiagnosticLevel | undefined;
}

export const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
    identifier: DiagnosticLevel.error,
    alg: DiagnosticLevel.error,
    algMissingReference: DiagnosticLevel.warning,
    algCalc: DiagnosticLevel.warning,
};

export function toSeverity(
    level: DiagnosticLevel | undefined
): DiagnosticSeverity | undefined {
    switch (level) {
        case DiagnosticLevel.error:
            return DiagnosticSeverity.Error;
        case DiagnosticLevel.warning:
            return DiagnosticSeverity.Warning;
        case DiagnosticLevel.hint:
            return DiagnosticSeverity.Hint;
        default:
            return undefined;
    }
}

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
        source: "SEPTIC",
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
        return getDiagnostics(cnfg, doc, settings, refProvider);
    }
}

export function getDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings,
    refProvider: SepticReferenceProvider
) {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...identifierDiagnostics(cnfg, doc, settings));
    diagnostics.push(...algDiagnostic(cnfg, doc, settings, refProvider));
    let disabledLines = getDisabledLines(cnfg.comments, doc);
    let filteredDiags = diagnostics.filter((diag) => {
        let disabledLine = disabledLines.get(diag.range.start.line);
        if (!disabledLine) {
            return true;
        }
        if (!disabledLine.diagnosticCodes.length) {
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
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings
): Diagnostic[] {
    const severity = toSeverity(settings.identifier);
    if (!severity) {
        return [];
    }
    const diagnostics: Diagnostic[] = [];
    for (let obj of cnfg.objects) {
        if (!obj.identifier) {
            const diagnostic: Diagnostic = createDiagnostic(
                severity,
                {
                    start: doc.positionAt(obj.start),
                    end: doc.positionAt(obj.start + obj.type.length),
                },
                `Missing identifier for object of type ${obj.type}.`,
                DiagnosticCode.E101
            );
            diagnostics.push(diagnostic);
            continue;
        }

        let report = validateIdentifier(obj.identifier.name);
        if (report.valid) {
            continue;
        }

        if (!report.containsLetter) {
            const diagnostic: Diagnostic = createDiagnostic(
                severity,
                {
                    start: doc.positionAt(obj.identifier.start),
                    end: doc.positionAt(obj.identifier.end),
                },
                `Identifier needs to contain minimum one letter.`,
                DiagnosticCode.E101
            );
            diagnostics.push(diagnostic);
        }

        if (report.invalidChars.length) {
            const diagnostic: Diagnostic = createDiagnostic(
                severity,
                {
                    start: doc.positionAt(obj.identifier.start),
                    end: doc.positionAt(obj.identifier.end),
                },
                `Identifier contains the following invalid chars: ${report.invalidChars}.`,
                DiagnosticCode.E101
            );
            diagnostics.push(diagnostic);
        }
    }

    return diagnostics;
}

export function algDiagnostic(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings,
    refProvider: SepticReferenceProvider
): Diagnostic[] {
    const severityAlg = toSeverity(settings.alg);
    const severityMissingReference = toSeverity(settings.algMissingReference);
    const severityCalc = toSeverity(settings.algCalc);

    const metaInfoProvider = SepticMetaInfoProvider.getInstance();

    if (!severityAlg) {
        return [];
    }
    const diagnostics: Diagnostic[] = [];
    let algAttrs = cnfg.getAlgAttrs();

    for (let i = 0; i < algAttrs.length; i++) {
        let alg = algAttrs[i];
        let expr;
        try {
            expr = parseAlg(
                alg.values[0].value.substring(1, alg.values[0].value.length - 1)
            );
        } catch (error: any) {
            let severity: DiagnosticSeverity = severityAlg;
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
                        alg.values[0].start + 1 + error.token.start
                    ),
                    end: doc.positionAt(alg.values[0].end),
                },
                error.message,
                DiagnosticCode.E201
            );
            diagnostics.push(diagnostic);
            continue;
        }
        const visitor = new AlgVisitor();
        visitor.visit(expr);

        //Check that all calcs are valid
        if (severityCalc) {
            visitor.calcs.forEach((calc) => {
                if (!metaInfoProvider.hasCalc(calc.identifier)) {
                    const diagnostic = createDiagnostic(
                        severityCalc,
                        {
                            start: doc.positionAt(
                                alg.values[0].start + 1 + calc.start
                            ),
                            end: doc.positionAt(
                                alg.values[0].start + 1 + calc.start
                            ),
                        },
                        `Calc with unknown indentifier: ${calc.identifier}.`,
                        DiagnosticCode.E203
                    );
                    diagnostics.push(diagnostic);
                }
            });
        }

        //Check that all references to Xvrs exist in the config
        if (severityMissingReference) {
            for (let variable of visitor.variables) {
                if (/^\{\{.*\}\}$/.test(variable.value)) {
                    continue;
                }
                let refs = refProvider.getXvrRefs(variable.value.split(".")[0]);
                if (!refs || !validateRefs(refs!)) {
                    const diagnostic = createDiagnostic(
                        severityMissingReference,
                        {
                            start: doc.positionAt(
                                alg.values[0].start + 1 + variable.start
                            ),
                            end: doc.positionAt(
                                alg.values[0].start + 1 + variable.end
                            ),
                        },
                        `Undefined Xvr '${variable.value}'.`,
                        DiagnosticCode.E202
                    );
                    diagnostics.push(diagnostic);
                }
            }
        }
    }
    return diagnostics;
}

function validateRefs(refs: SepticReference[]) {
    for (const ref of refs) {
        if (ref.obj) {
            return true;
        }
    }
    return false;
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

export interface DisabledLine {
    line: number;
    diagnosticCodes: string[];
}

function getDisabledLines(
    comments: SepticComment[],
    doc: ITextDocument
): Map<number, { diagnosticCodes: string[] }> {
    let disabledLinesMap = new Map<number, { diagnosticCodes: string[] }>();
    for (let comment of comments) {
        let match = comment.content.match(disableDiagnosticRegex);
        if (!match) {
            continue;
        }
        let line = doc.positionAt(comment.start).line;
        if (match[1]) {
            disabledLinesMap.set(line, {
                diagnosticCodes: getDiagnosticCodes(match[1]),
            });
            continue;
        }
        if (match[2]) {
            disabledLinesMap.set(line, {
                diagnosticCodes: getDiagnosticCodes(match[2]),
            });
            continue;
        }
        disabledLinesMap.set(line, { diagnosticCodes: [] });
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
