/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticMetaInfoProvider } from "../septic";
import { SepticConfigProvider } from "../configProvider";

export class FoldingRangeProvider {
    private readonly cnfgProvider: SepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideFoldingRanges(
        doc: ITextDocument,
    ): Promise<lsp.FoldingRange[]> {
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }

        return getFoldingRanges(doc, cnfg);
    }
}

export function getFoldingRanges(
    doc: ITextDocument,
    cnfg: SepticCnfg,
): lsp.FoldingRange[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const ranges: lsp.FoldingRange[] = [];

    for (let i = 0; i < cnfg.objects.length; i++) {
        const obj = cnfg.objects[i];
        let end = i;
        const level = metaInfoProvider.getObjectDefault(obj.type).level;

        let j = i + 1;
        while (j < cnfg.objects.length) {
            const objectLevel = metaInfoProvider.getObjectDefault(
                cnfg.objects[j].type
            ).level;
            if (objectLevel <= level) {
                break;
            }
            end = j;
            j += 1;
        }
        const lastObject = end < cnfg.objects.length - 1;
        const endLine = lastObject
            ? doc.positionAt(cnfg.objects[end + 1].start).line - 1
            : doc.positionAt(cnfg.objects[end].end).line;
        ranges.push({
            startLine: doc.positionAt(obj.start).line,
            endLine: endLine,
        });
    }

    return ranges;
}
