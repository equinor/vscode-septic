/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection } from "vscode-languageserver";
import { DiagnosticsSettings } from "./language-service/diagnosticsProvider.js";
import { SepticMetaInfoProvider } from "@equinor/septic-config-lib";

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

interface CodeActionsSettings {
    insertEvrPosition: "top" | "bottom";
}

interface DocumentationSettings {
    version: string;
}

export interface CompletionSettings {
    onlySuggestValidSnippets: boolean;
}

export interface Settings {
    readonly diagnostics: DiagnosticsSettings;
    readonly folding: FoldingSettings;
    readonly formatting: FormattingSettings;
    readonly encoding: "utf8" | "windows1252";
    readonly ignored: IgnoredSettings;
    readonly codeActions: CodeActionsSettings;
    readonly documentation: DocumentationSettings;
    readonly completion: CompletionSettings;
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
        const workspaceFolders =
            await this.connection.workspace.getWorkspaceFolders();
        const scopeUri =
            workspaceFolders && workspaceFolders.length > 0
                ? workspaceFolders[0].uri
                : undefined;
        const settings = await this.connection.workspace.getConfiguration({
            scopeUri: scopeUri,
            section: "septic",
        });
        const scodesettings = await this.connection.workspace.getConfiguration({
            scopeUri: scopeUri,
            section: "[septic]",
        });
        this.settings = {
            diagnostics: settings.diagnostics,
            folding: settings.folding,
            formatting: settings.formatting,
            encoding: scodesettings["files.encoding"],
            ignored: settings.ignored,
            codeActions: settings.codeActions,
            documentation: settings.documentation,
            completion: settings.completion,
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
                this.settings.documentation.version,
            );
        }
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();

        metaInfoProvider.updateObjectLevel("CalcModl", level);
    }
}
