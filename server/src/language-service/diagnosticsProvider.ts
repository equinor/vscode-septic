/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CancellationToken,
    Diagnostic,
    DiagnosticSeverity,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { AlgVisitor, SepticCnfg, parseAlg } from "../parser";
import { SettingsManager } from "../settings";
import { SepticMetaInfoProvider } from "./septicMetaInfoProvider";

export enum DiagnosticLevel {
    error = "error",
    warning = "warning",
    hint = "hint",
    ignore = "ignore",
}

export interface DiagnosticsSettings {
    readonly enabled: boolean;
    readonly missingVariable: DiagnosticLevel | undefined;
    readonly alg: DiagnosticLevel | undefined;
    readonly algMissingReference: DiagnosticLevel | undefined;
    readonly algCalc: DiagnosticLevel | undefined;
}

export const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
    missingVariable: DiagnosticLevel.error,
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

export class DiagnosticProvider {
    private readonly cnfgProvider: ISepticConfigProvider;
    private readonly settingsManager: SettingsManager;
    private readonly metaInfoProvider: SepticMetaInfoProvider;

    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager,
        metaInfoProvider: SepticMetaInfoProvider
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
        this.metaInfoProvider = metaInfoProvider;
    }

    public provideDiagnostics(
        doc: ITextDocument,
        token: CancellationToken | undefined = undefined
    ): Diagnostic[] {
        const cnfg = this.cnfgProvider.get(doc.uri);
        if (cnfg === undefined) {
            return [];
        }

        let settings =
            this.settingsManager.getSettings()?.diagnostics ??
            defaultDiagnosticsSettings;

        if (!settings.enabled) {
            return [];
        }

        return getDiagnostics(cnfg, doc, settings, this.metaInfoProvider);
    }
}

function getDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings,
    septicMetaInfoProvider: SepticMetaInfoProvider
) {
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(...missingIdentifierDiagnostic(cnfg, doc, settings));
    diagnostics.push(
        ...algDiagnostic(cnfg, doc, settings, septicMetaInfoProvider)
    );
    return diagnostics;
}

function missingIdentifierDiagnostic(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings
): Diagnostic[] {
    const severity = toSeverity(settings.missingVariable);

    if (!severity) {
        return [];
    }
    const diagnostics: Diagnostic[] = [];

    cnfg.objects.forEach((elem) => {
        if (!elem.identifier) {
            const diagnostic: Diagnostic = {
                severity: severity,
                range: {
                    start: doc.positionAt(elem.start),
                    end: doc.positionAt(elem.start + elem.type.length),
                },
                message: `Missing identifier for object of type ${elem.type}`,
            };
            diagnostics.push(diagnostic);
        }
    });

    return diagnostics;
}

export function algDiagnostic(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings,
    metaInfoProvider: SepticMetaInfoProvider
): Diagnostic[] {
    const severityAlg = toSeverity(settings.alg);
    const severityMissingReference = toSeverity(settings.algMissingReference);
    const severityCalc = toSeverity(settings.algCalc);

    if (!severityAlg) {
        return [];
    }
    const diagnostics: Diagnostic[] = [];
    let algAttrs = cnfg.getAlgAttr();

    for (let i = 0; i < algAttrs.length; i++) {
        let alg = algAttrs[i];
        let expr;
        try {
            expr = parseAlg(
                alg.values[0].value.substring(1, alg.values[0].value.length - 1)
            );
        } catch (e: any) {
            diagnostics.push({
                severity: severityAlg,
                range: {
                    start: doc.positionAt(
                        alg.values[0].start + 1 + e.token.start
                    ),
                    end: doc.positionAt(alg.values[0].end),
                },
                message: e.message,
            });
            continue;
        }
        const visitor = new AlgVisitor();
        visitor.visit(expr);

        //Check that all calcs are valid
        if (severityCalc) {
            visitor.calcs.forEach((calc) => {
                if (!metaInfoProvider.hasCalc(calc.identifier)) {
                    diagnostics.push({
                        severity: severityCalc,
                        range: {
                            start: doc.positionAt(
                                alg.values[0].start + 1 + calc.start
                            ),
                            end: doc.positionAt(
                                alg.values[0].start + 1 + calc.start
                            ),
                        },
                        message: `Calc with unknown indentifier: ${calc.identifier}.`,
                    });
                }
            });
        }

        //Check that all references to Xvrs exist in the config
        if (severityMissingReference) {
            visitor.variables.forEach((variable) => {
                let reference = cnfg.getXvr(variable.value);
                if (!reference) {
                    diagnostics.push({
                        severity: severityMissingReference,
                        range: {
                            start: doc.positionAt(
                                alg.values[0].start + 1 + variable.start
                            ),
                            end: doc.positionAt(
                                alg.values[0].start + 1 + variable.end
                            ),
                        },
                        message: `Reference to Xvr that don't exist: ${variable.value} .`,
                    });
                }
            });
        }
    }
    return diagnostics;
}
