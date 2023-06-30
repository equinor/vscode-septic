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
    /\/\/\s+noqa\b(?::([ \w,]*))?|\{#\s+noqa\b(?::([ \w,]*))?\s*#\}/i;
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
    diagnostics.push(...identifierDiagnostics(cnfg, doc));
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
    cnfg: SepticCnfg,
    doc: ITextDocument
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (let obj of cnfg.objects) {
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
            continue;
        }

        let report = validateIdentifier(obj.identifier.name);
        if (report.valid) {
            continue;
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
        let alg = algAttrs[i];
        let expr;
        try {
            expr = parseAlg(
                alg.values[0].value.substring(1, alg.values[0].value.length - 1)
            );
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
        visitor.calcs.forEach((calc) => {
            if (!metaInfoProvider.hasCalc(calc.identifier)) {
                const diagnostic = createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(
                            alg.values[0].start + 1 + calc.start
                        ),
                        end: doc.positionAt(
                            alg.values[0].start + 1 + calc.start
                        ),
                    },
                    `Calc with unknown indentifier: ${calc.identifier}`,
                    DiagnosticCode.E203
                );
                diagnostics.push(diagnostic);
            }
        });

        //Check that all references to Xvrs exist in the config
        for (let variable of visitor.variables) {
            if (/^\{\{.*\}\}$/.test(variable.value)) {
                continue;
            }
            let refs = refProvider.getXvrRefs(variable.value.split(".")[0]);
            if (!refs || !validateRefs(refs!)) {
                const diagnostic = createDiagnostic(
                    DiagnosticSeverity.Error,
                    {
                        start: doc.positionAt(
                            alg.values[0].start + 1 + variable.start
                        ),
                        end: doc.positionAt(
                            alg.values[0].start + 1 + variable.end
                        ),
                    },
                    `Undefined Xvr '${variable.value}'`,
                    DiagnosticCode.E202
                );
                diagnostics.push(diagnostic);
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
