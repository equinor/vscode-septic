/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticCnfg } from "./cnfg";
import { SepticAttribute } from "./elements";
import {
    SepticMetaInfoProvider,
    SepticAttributeDocumentation,
    ISepticObjectDocumentation,
} from "./metaInfoProvider";

export interface ObjectDocProvider {
    getObjectDocumentation(
        objectType: string,
    ): ISepticObjectDocumentation | undefined;
}

interface OffsetRange {
    start: number;
    end: number;
}

/**
 * Returns the text of a cnfg with all attributes set to their default values removed.
 */
export function removeDefaultLines(
    cnfg: SepticCnfg,
    provider?: ObjectDocProvider,
): string {
    const metaInfo = provider ?? SepticMetaInfoProvider.getInstance();
    const text = cnfg.doc.getText();
    const rangesToRemove: OffsetRange[] = [];

    for (const obj of cnfg.objects) {
        const objDoc = metaInfo.getObjectDocumentation(obj.type);
        if (!objDoc) {
            continue;
        }
        for (const attr of obj.attributes) {
            const attrDoc = objDoc.getAttribute(attr.key);
            if (!attrDoc || !attrDoc.default || attrDoc.default.length === 0) {
                continue;
            }
            if (isDefault(attr, attrDoc)) {
                const range = getAttributeLineRange(text, attr);
                if (range) {
                    rangesToRemove.push(range);
                }
            }
        }
    }

    if (rangesToRemove.length === 0) {
        return text;
    }

    // Sort by start offset descending so removals don't shift earlier offsets
    rangesToRemove.sort((a, b) => b.start - a.start);

    let result = text;
    for (const range of rangesToRemove) {
        result = result.slice(0, range.start) + result.slice(range.end);
    }
    return result;
}

function isDefault(
    attr: SepticAttribute,
    attrDoc: SepticAttributeDocumentation,
): boolean {
    const values = attr.getValues();
    const defaults: (string | number)[] = attrDoc.default;

    if (values.length !== defaults.length) {
        return false;
    }

    for (let i = 0; i < values.length; i++) {
        if (normalizeValue(values[i]!) !== normalizeValue(defaults[i]!)) {
            return false;
        }
    }
    return true;
}

function normalizeValue(value: string | number): string {
    let str = String(value);
    // Remove surrounding quotes
    if (
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))
    ) {
        str = str.slice(1, -1);
    }
    return str.trim();
}

/**
 * Returns the full line range (including trailing newline) that contains the attribute.
 * Expands to cover all lines the attribute spans.
 */
function getAttributeLineRange(
    text: string,
    attr: SepticAttribute,
): OffsetRange | undefined {
    // Find start of line containing attr.start
    let lineStart = attr.start;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") {
        lineStart--;
    }

    // Find end of line containing attr.end
    let lineEnd = attr.end;
    while (lineEnd < text.length && text[lineEnd] !== "\n") {
        lineEnd++;
    }
    // Include the newline character
    if (lineEnd < text.length && text[lineEnd] === "\n") {
        lineEnd++;
    }

    return { start: lineStart, end: lineEnd };
}
