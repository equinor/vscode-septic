/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection } from "vscode-languageserver";
import { DiagnosticsSettings } from "./language-service/diagnosticsProvider";

export interface Settings {
    readonly diagnostics: DiagnosticsSettings;
}

export class SettingsManager {
    private settings: Settings | undefined;

    private readonly connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    public getSettings(): Settings | undefined {
        if (!this.settings) {
            this.updateSettings();
        }
        return this.settings;
    }

    public invalidate(): void {
        this.settings = undefined;
    }

    public updateSettings(): void {
        this.connection.workspace.getConfiguration("septic").then((value) => {
            this.settings = value;
        });
    }
}
