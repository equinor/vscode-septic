import { Connection, WorkspaceFolder } from "vscode-languageserver";
import { SettingsManager } from "./settings";


export interface IgnoredPaths {
    regex: string;
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
    const ignoredPaths: { [key: string]: string[] } = settings.ignored.paths;
    const ignorePatterns: IgnoredPaths[] = [];
    Object.keys(ignoredPaths).forEach((path) => {
        ignorePatterns.push({ regex: pathToRegex(path), codes: ignoredPaths[path] });
    })
    return ignorePatterns;
}

export function getIgnoredCodes(path: string, ignorePatterns: IgnoredPaths[]): string[] | undefined {
    for (const ignorePattern of ignorePatterns) {
        const regexPattern = new RegExp(ignorePattern.regex);
        if (regexPattern.test(path)) {
            return ignorePattern.codes;
        }
    }
    return undefined;
}

function pathToRegex(path: string): string {
    // Convert path to a regex pattern
    let workspacePath = "*" + path;
    let pattern = workspacePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special characters
    pattern = pattern.replace(/\\\*/g, ".*"); // Replace * with .*
    pattern = pattern.replace(/\\\?/g, "."); // Replace ? with .

    // Ensure the pattern matches the whole path
    pattern = `^${pattern}$`;

    return pattern;
}
