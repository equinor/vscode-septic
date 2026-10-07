/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface CaseDiscrepancy {
    fileName: string;
    actualName: string;
    offset: number;
}

export function findLayoutCaseDiscrepancies(
    layoutNames: string[],
    dirEntries: string[],
    yamlText: string,
): CaseDiscrepancy[] {
    return findDiscrepancies(
        layoutNames.map((fileName) => ({
            fileName,
            entryName: fileName,
            dirEntries,
            offset: findLayoutNameOffset(yamlText, fileName),
        })),
    );
}

export function findSourceCaseDiscrepancies(
    sourcePaths: string[],
    dirEntriesBySource: ReadonlyMap<string, string[]>,
    yamlText: string,
): CaseDiscrepancy[] {
    return findDiscrepancies(
        sourcePaths.map((fileName) => ({
            fileName,
            entryName: fileName.split(/[\\/]/).pop() ?? fileName,
            dirEntries: dirEntriesBySource.get(fileName) ?? [],
            offset: findSourceFilenameOffset(yamlText, fileName),
        })),
    );
}

function findDiscrepancies(
    candidates: {
        fileName: string;
        entryName: string;
        dirEntries: string[];
        offset: number;
    }[],
): CaseDiscrepancy[] {
    return candidates.flatMap(({ fileName, entryName, dirEntries, offset }) => {
        const actualName = dirEntries.find(
            (entry) => entry.toLowerCase() === entryName.toLowerCase(),
        );
        return actualName && actualName !== entryName && offset >= 0
            ? [{ fileName, actualName, offset }]
            : [];
    });
}

export function findSourceFilenameOffset(text: string, fileName: string): number {
    return findYamlValueOffset(text, "sources", "filename", fileName);
}

export function findLayoutNameOffset(text: string, fileName: string): number {
    return findYamlValueOffset(text, "layout", "name", fileName);
}

function findYamlValueOffset(
    text: string,
    section: string,
    field: string,
    sourcePath: string,
): number {
    const header = new RegExp(
        `^${escapeRegExp(section)}:[ \\t]*(?:#.*)?(?:\\r?\\n|$)`,
        "m",
    ).exec(text);
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
    let listIndent: number | undefined;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\r?\n$/, "");
        if (listIndent !== undefined) {
            const indent = line.match(/^[ \t]*/)?.[0].length ?? 0;
            if (line.trim() && indent <= listIndent) {
                listIndent = undefined;
            } else {
                const listItem = /^\s*-\s*(.*)$/.exec(line);
                if (listItem) {
                    const valueOffset = findYamlValueInLine(
                        listItem[1],
                        sourcePath,
                    );
                    if (valueOffset >= 0) {
                        return lineOffset + line.indexOf(listItem[1]) + valueOffset;
                    }
                }
            }
        }

        const fieldPattern = new RegExp(
            `^\\s*(?:-\\s*)?${escapeRegExp(field)}:\\s*(.*)$`,
        );
        const fieldMatch = fieldPattern.exec(line);
        if (fieldMatch) {
            const value = fieldMatch[1];
            if (value.trim()) {
                const valueOffset = findYamlValueInLine(value, sourcePath);
                if (valueOffset >= 0) {
                    return lineOffset + line.indexOf(value) + valueOffset;
                }
            } else {
                listIndent = line.indexOf(`${field}:`);
            }
        }
        lineOffset += rawLine.length;
    }
    return -1;
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findYamlValueInLine(value: string, fileName: string): number {
    const withoutComment = value.replace(/\s+#.*$/, "");
    const regex = new RegExp(
        `(?:^|\\[|,)\\s*(?:["'])?${escapeRegExp(fileName)}(?:["'])?(?=\\s*(?:,|\\]|$))`,
    );
    const match = regex.exec(withoutComment);
    return match ? match.index + match[0].lastIndexOf(fileName) : -1;
}
