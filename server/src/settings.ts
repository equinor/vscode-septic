import { Connection } from "vscode-languageserver";
import { DiagnosticsSettings } from "./language-service/diagnosticsProvider";
import { HiearchySettings } from "./util";

export interface Settings {
  readonly diagnostics: DiagnosticsSettings;
  readonly hiearchy: HiearchySettings;
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
