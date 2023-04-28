/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg } from "../parser";
import { SepticConfigProvider } from "./septicConfigProvider";
import { SettingsManager } from "../settings";
import { getHierarchyLevel } from "../util";

export class FoldingRangeProvider {
    private readonly cnfgProvider: SepticConfigProvider;
    private readonly settingsManager: SettingsManager;

    constructor(
        cnfgProvider: SepticConfigProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    public provideFoldingRanges(
        doc: ITextDocument,
        token: lsp.CancellationToken
    ): lsp.FoldingRange[] {
        let cnfg = this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }

        return getFoldingRanges(doc, cnfg, token);
    }
}

export function getFoldingRanges(
    doc: ITextDocument,
    cnfg: SepticCnfg,
    token: lsp.CancellationToken | undefined = undefined
): lsp.FoldingRange[] {
    let ranges: lsp.FoldingRange[] = [];

    for (let i = 0; i < cnfg.objects.length; i++) {
        let obj = cnfg.objects[i];
        let end = i;
        let level = getHierarchyLevel(obj);

        let j = i + 1;
        while (j < cnfg.objects.length) {
            if (token?.isCancellationRequested) {
                return [];
            }
            if (getHierarchyLevel(cnfg.objects[j]) <= level) {
                break;
            }
            end = j;
            j += 1;
        }
        let lastObject = end < cnfg.objects.length - 1;
        let endLine = lastObject
            ? doc.positionAt(cnfg.objects[end + 1].start).line - 1
            : doc.positionAt(cnfg.objects[end].end).line;
        ranges.push({
            startLine: doc.positionAt(obj.start).line,
            endLine: endLine,
        });
    }

    return ranges;
}
