/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection } from "vscode-languageserver";
import { DiagnosticsSettings } from "./language-service/diagnosticsProvider";
import { SepticMetaInfoProvider } from "./septic";

const updatedFoldingLevel = 1;
const defaultFoldingLevelCalcModl = 2;

interface FoldingSettings {
    readonly calcModl: boolean;
}
interface FormattingSettings {
    readonly enabled: boolean;
}

export interface Settings {
    readonly diagnostics: DiagnosticsSettings;
    readonly folding: FoldingSettings;
    readonly formatting: FormattingSettings;
}

export class SettingsManager {
    private settings: Settings | undefined;

    private readonly connection: Connection;

    private updateSettingsPromise: Promise<void | undefined> | undefined;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    public async getSettings(): Promise<Settings | undefined> {
        if (!this.settings) {
            await this.update();
        }
        return this.settings;
    }

    public async invalidate(): Promise<void> {
        this.settings = undefined;
    }

    private async updateSettings(): Promise<void> {
        const settings = await this.connection.workspace.getConfiguration(
            "septic"
        );
        this.settings = settings;
        this.updateMetaInfo();
    }

    public update(): Promise<void | undefined> {
        if (this.updateSettingsPromise) {
            return this.updateSettingsPromise;
        }
        const prom = this.updateSettings();
        prom.finally(() => {
            this.updateSettingsPromise = undefined;
        });
        this.updateSettingsPromise = prom;
        return prom;
    }

    private updateMetaInfo(): void {
        let level = this.settings?.folding.calcModl
            ? updatedFoldingLevel
            : defaultFoldingLevelCalcModl;

        let metaInfoProvider = SepticMetaInfoProvider.getInstance();

        metaInfoProvider.updateObjectLevel("CalcModl", level);
    }
}
