import { Connection, WorkspaceFolder } from "vscode-languageserver";
import { SettingsManager } from "./settings";

export async function getIgnorePatterns(
    connection: Connection,
    settingsManager: SettingsManager
): Promise<string[]> {
    const workspaceFolders: WorkspaceFolder[] | null =
        await connection.workspace.getWorkspaceFolders();
    if (!workspaceFolders) {
        return [];
    }
    const workspaceFoldersNames = workspaceFolders.map((wf) => wf.name);
    const settings = await settingsManager.getSettings();
    const ignoredPaths = settings?.ignored.paths ?? [];
    const ignorePatterns: string[] = [];
    for (let path of ignoredPaths) {
        let root = path.split("/")[0];
        if (!workspaceFoldersNames.includes(root)) {
            continue;
        }
        ignorePatterns.push(pathToRegex(path));
    }
    return ignorePatterns;
}

export function isPathIgnored(path: string, ignorePatterns: string[]): boolean {
    for (const ignorePattern of ignorePatterns) {
        const regexPattern = new RegExp(ignorePattern);
        if (regexPattern.test(path)) {
            return true;
        }
    }
    return false;
}

function pathToRegex(path: string): string {
    // Convert path to a regex pattern
    let workspacePath = "*/" + path;
    let pattern = workspacePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special characters
    pattern = pattern.replace(/\\\*/g, ".*"); // Replace * with .*
    pattern = pattern.replace(/\\\?/g, "."); // Replace ? with .

    // Ensure the pattern matches the whole path
    pattern = `^${pattern}$`;

    return pattern;
}
