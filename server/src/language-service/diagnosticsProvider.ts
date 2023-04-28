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
import { SepticCnfg } from "../parser";
import { SettingsManager } from "../settings";

export enum DiagnosticLevel {
    error = "error",
    warning = "warning",
    hint = "hint",
    ignore = "ignore",
}

export interface DiagnosticsSettings {
    readonly enabled: boolean;
    readonly missingVariable: DiagnosticLevel | undefined;
}

const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
    missingVariable: DiagnosticLevel.error,
};

function toSeverity(
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

    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
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

        return getDiagnostics(cnfg, doc, settings);
    }
}

function getDiagnostics(
    cnfg: SepticCnfg,
    doc: ITextDocument,
    settings: DiagnosticsSettings
) {
    const diagnostics: Diagnostic[] = [];

    diagnostics.push(...missingIdentifierDiagnostic(cnfg, doc, settings));
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
