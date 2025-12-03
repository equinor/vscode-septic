/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FoldingRange, FoldingRangeParams } from 'vscode-languageserver';
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
        params: FoldingRangeParams,
    ): Promise<FoldingRange[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }

        return getFoldingRanges(cnfg);
    }
}

export function getFoldingRanges(
    cnfg: SepticCnfg,
): FoldingRange[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const ranges: FoldingRange[] = [];

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
            ? cnfg.positionAt(cnfg.objects[end + 1].start).line - 1
            : cnfg.positionAt(cnfg.objects[end].end).line;
        ranges.push({
            startLine: cnfg.positionAt(obj.start).line,
            endLine: endLine,
        });
    }

    return ranges;
}
