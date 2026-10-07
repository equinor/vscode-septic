/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface CaseDiscrepancy {
    fileName: string;
    actualName: string;
    offset: number;
}

export function findCaseDiscrepancies(
    layoutNames: string[],
    dirEntries: string[],
    yamlText: string,
): CaseDiscrepancy[] {
    const discrepancies: CaseDiscrepancy[] = [];
    for (const fileName of layoutNames) {
        const actualEntry = dirEntries.find(
            (entry) => entry.toLowerCase() === fileName.toLowerCase(),
        );
        if (actualEntry && actualEntry !== fileName) {
            const offset = findLayoutNameOffset(yamlText, fileName);
            if (offset >= 0) {
                discrepancies.push({
                    fileName,
                    actualName: actualEntry,
                    offset,
                });
            }
        }
    }
    return discrepancies;
}

export function findSourceCaseDiscrepancies(
    sourcePaths: string[],
    dirEntriesBySource: ReadonlyMap<string, string[]>,
    yamlText: string,
): CaseDiscrepancy[] {
    const discrepancies: CaseDiscrepancy[] = [];
    for (const sourcePath of sourcePaths) {
        const fileName = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
        const dirEntries = dirEntriesBySource.get(sourcePath) ?? [];
        const actualEntry = dirEntries.find(
            (entry) => entry.toLowerCase() === fileName.toLowerCase(),
        );
        if (actualEntry && actualEntry !== fileName) {
            const offset = findSourceFilenameOffset(yamlText, sourcePath);
            if (offset >= 0) {
                discrepancies.push({
                    fileName: sourcePath,
                    actualName: actualEntry,
                    offset,
                });
            }
        }
    }
    return discrepancies;
}

export function findSourceFilenameOffset(
    text: string,
    sourcePath: string,
): number {
    const header = /^sources:[ \t]*(?:#.*)?(?:\r?\n|$)/m.exec(text);
    if (!header) {
        return -1;
    }

    const sectionStart = header.index + header[0].length;
    const nextSection = /^[^ \t#][^:\r\n]*:[ \t]*(?:#.*)?\r?$/gm;
    nextSection.lastIndex = sectionStart;
    const sectionEnd = nextSection.exec(text)?.index ?? text.length;
    const lines = text
        .slice(sectionStart, sectionEnd)
        .match(/[^\n]*\n|[^\n]+$/g) ?? [];

    let lineOffset = sectionStart;
    let filenameListIndent: number | undefined;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\r?\n$/, "");
        if (filenameListIndent !== undefined) {
            const indent = line.match(/^[ \t]*/)?.[0].length ?? 0;
            if (line.trim() && indent <= filenameListIndent) {
                filenameListIndent = undefined;
            } else {
                const listItem = /^\s*-\s*(.*)$/.exec(line);
                if (listItem) {
                    const valueOffset = findFilenameValueOffset(
                        listItem[1],
                        sourcePath,
                    );
                    if (valueOffset >= 0) {
                        return lineOffset + line.indexOf(listItem[1]) + valueOffset;
                    }
                }
            }
        }

        const filenameField = /^\s*(?:-\s*)?filename:\s*(.*)$/.exec(line);
        if (filenameField) {
            const value = filenameField[1];
            if (value.trim()) {
                const valueOffset = findFilenameValueOffset(value, sourcePath);
                if (valueOffset >= 0) {
                    return lineOffset + line.indexOf(value) + valueOffset;
                }
            } else {
                filenameListIndent = line.indexOf("filename:");
            }
        }
        lineOffset += rawLine.length;
    }
    return -1;
}

export function findLayoutNameOffset(text: string, fileName: string): number {
    const regex = new RegExp(
        `(?:^|\\n)\\s*-?\\s*name:\\s*${escapeRegExp(fileName)}`,
        "m",
    );
    const match = regex.exec(text);
    if (match) {
        return match.index + match[0].indexOf(fileName);
    }
    return -1;
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFilenameValueOffset(value: string, fileName: string): number {
    const withoutComment = value.replace(/\s+#.*$/, "");
    const regex = new RegExp(
        `(?:^|\\[|,)\\s*(?:["'])?${escapeRegExp(fileName)}(?:["'])?(?=\\s*(?:,|\\]|$))`,
    );
    const match = regex.exec(withoutComment);
    return match ? match.index + match[0].lastIndexOf(fileName) : -1;
}
