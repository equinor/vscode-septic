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

interface IgnoredSettings {
    paths: { [key: string]: string[] };
}

interface CodeActions {
    insertEvrPosition: "top" | "bottom";
}

interface Documentation {
    version: string;
}

export interface Settings {
    readonly diagnostics: DiagnosticsSettings;
    readonly folding: FoldingSettings;
    readonly formatting: FormattingSettings;
    readonly encoding: "utf8" | "windows1252";
    readonly ignored: IgnoredSettings;
    readonly codeActions: CodeActions;
    readonly documentation: Documentation;
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
        const settings = await this.connection.workspace.getConfiguration();
        this.settings = {
            diagnostics: settings["septic"].diagnostics,
            folding: settings["septic"].folding,
            formatting: settings["septic"].formatting,
            encoding: settings["[septic]"]["files.encoding"],
            ignored: settings["septic"].ignored,
            codeActions: settings["septic"].codeActions,
            documentation: settings["septic"].documentation,
        };
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
        const level = this.settings?.folding.calcModl
            ? updatedFoldingLevel
            : defaultFoldingLevelCalcModl;
        if (this.settings) {
            SepticMetaInfoProvider.setVersion(
                this.settings.documentation.version
            );
        }
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();

        metaInfoProvider.updateObjectLevel("CalcModl", level);
    }
}
