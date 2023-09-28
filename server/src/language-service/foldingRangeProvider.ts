/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticMetaInfoProvider } from "../septic";
import { SepticConfigProvider } from "./septicConfigProvider";

export class FoldingRangeProvider {
    private readonly cnfgProvider: SepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideFoldingRanges(
        doc: ITextDocument,
        token: lsp.CancellationToken
    ): Promise<lsp.FoldingRange[]> {
        let cnfg = await this.cnfgProvider.get(doc.uri);
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
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let ranges: lsp.FoldingRange[] = [];

    for (let i = 0; i < cnfg.objects.length; i++) {
        let obj = cnfg.objects[i];
        let end = i;
        let level = metaInfoProvider.getObjectDefault(obj.type).level;

        let j = i + 1;
        while (j < cnfg.objects.length) {
            if (token?.isCancellationRequested) {
                return [];
            }
            let objectLevel = metaInfoProvider.getObjectDefault(
                cnfg.objects[j].type
            ).level;
            if (objectLevel <= level) {
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
