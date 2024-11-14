import { Connection, } from 'vscode-languageserver';
import { SettingsManager } from "./settings";


export interface IgnoredPaths {
    regex: RegExp;
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
        ignorePatterns.push({ regex: pathToRegex(workspace, path), codes: ignoredPaths[path] });
    })
    return ignorePatterns;
}

export function getIgnoredCodes(path: string, ignorePatterns: IgnoredPaths[]): string[] | undefined {
    for (const ignorePattern of ignorePatterns) {
        if (ignorePattern.regex.test(path)) {
            return ignorePattern.codes;
        }
    }
    return undefined;
}

function pathToRegex(workspace: string, path: string): RegExp {
    path = path.replace(/^\./, "").replace(/^\//, "");
    const absPath = workspace + "/" + path;
    let pattern = absPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special characters
    pattern = pattern.replace(/\\\*/g, ".*");
    pattern = pattern.replace(/\\\?/g, ".");
    pattern = `^${pattern}$`;
    return new RegExp(pattern)
}
