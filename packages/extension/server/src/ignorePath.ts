import { Connection, } from 'vscode-languageserver';
import { minimatch } from 'minimatch';
import { SettingsManager } from "./settings";


export interface IgnoredPaths {
    pattern: string;
    codes: string[];
}

export async function getIgnorePatterns(
    connection: Connection,
    settingsManager: SettingsManager
): Promise<IgnoredPaths[]> {
    const settings = await settingsManager.getSettings();
    if (!settings) {
        return [];
    }
    const folders = await connection.workspace.getWorkspaceFolders();
    const workspace = folders ? folders[0].uri : "*";
    const ignoredPaths: { [key: string]: string[] } = settings.ignored.paths;
    const ignorePatterns: IgnoredPaths[] = [];
    Object.keys(ignoredPaths).forEach((path) => {
        ignorePatterns.push({ pattern: toAbsoluteGlob(workspace, path), codes: ignoredPaths[path] });
    })
    return ignorePatterns;
}

export function getIgnoredCodes(path: string, ignorePatterns: IgnoredPaths[]): string[] | undefined {
    let matched = false;
    const codes = new Set<string>();
    for (const ignorePattern of ignorePatterns) {
        if (minimatch(path, ignorePattern.pattern)) {
            if (ignorePattern.codes.length === 0) {
                continue;
            }
            matched = true;
            if (ignorePattern.codes.includes("*")) {
                return ["*"];
            }
            ignorePattern.codes.forEach((code) => codes.add(code));
        }
    }
    return matched ? [...codes] : undefined;
}

export function toAbsoluteGlob(workspace: string, path: string): string {
    path = path.replace(/^\./, "").replace(/^\//, "");
    return workspace + "/" + path;
}
