/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { ISepticConfigProvider } from "../configProvider";
import {
    SepticContext,
    getDiagnostics,
    SepticDiagnosticLevel,
} from "@equinor/septic-config-lib";
import { SettingsManager } from "../settings";

export interface DiagnosticsSettings {
    readonly enabled: boolean;
}

export const defaultDiagnosticsSettings: DiagnosticsSettings = {
    enabled: true,
};

export class DiagnosticProvider {
    private readonly cnfgProvider: ISepticConfigProvider;
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager,
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideDiagnostics(
        uri: string,
        context: SepticContext,
    ): Promise<Diagnostic[]> {
        const cnfg = await this.cnfgProvider.get(uri);
        if (cnfg === undefined) {
            return [];
        }
        const settingsWorkspace = await this.settingsManager.getSettings();
        const settings =
            settingsWorkspace?.diagnostics ?? defaultDiagnosticsSettings;

        if (!settings.enabled) {
            return [];
        }
        await context.load();
        const diagnostics = getDiagnostics(cnfg, context);
        return diagnostics.map((diag) => {
            return {
                severity: mapDiagnosticSeverity(diag.level),
                range: diag.range,
                message: diag.message,
                code: diag.code,
                source: "septic",
            };
        });
    }
}

function mapDiagnosticSeverity(
    level: SepticDiagnosticLevel,
): DiagnosticSeverity {
    switch (level) {
        case SepticDiagnosticLevel.error:
            return DiagnosticSeverity.Error;
        case SepticDiagnosticLevel.warning:
            return DiagnosticSeverity.Warning;
        case SepticDiagnosticLevel.information:
            return DiagnosticSeverity.Information;
        case SepticDiagnosticLevel.hint:
            return DiagnosticSeverity.Hint;
    }
}
