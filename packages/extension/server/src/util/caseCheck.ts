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
