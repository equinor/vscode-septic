/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CompletionItem,
    TextDocumentPositionParams,
    CompletionItemKind,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    SepticMetaInfoProvider,
    SepticObject,
    SepticReferenceProvider,
} from "../septic";

export class CompletionProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    public async provideCompletion(
        pos: TextDocumentPositionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<CompletionItem[]> {
        const compItems: CompletionItem[] = [];
        const offset = doc.offsetAt(pos.position);
        const cnfg = await this.cnfgProvider.get(pos.textDocument.uri);
        if (!cnfg) {
            return [];
        }

        const obj = cnfg.getObjectFromOffset(offset);
        if (!obj) {
            return [];
        }
        await refProvider.load();
        const xvrs: SepticObject[] = refProvider.getAllXvrObjects();

        const relevantXvrs = getRelevantXvrs(obj, xvrs);

        relevantXvrs.forEach((xvr) => {
            compItems.push(xvrToCompletionItem(xvr));
        });

        if (cnfg.offsetInAlg(offset)) {
            compItems.push(...this.getCalcCompletion());
        }
        return compItems;
    }

    private getCalcCompletion(): CompletionItem[] {
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        const compItems: CompletionItem[] = [];
        let calcs = metaInfoProvider.getCalcs();
        for (let calc of calcs) {
            compItems.push({
                label: calc.name + "()",
                kind: CompletionItemKind.Function,
                detail: "SepticCalc",
                data: calc,
            });
        }
        return compItems;
    }
}

function xvrToCompletionItem(obj: SepticObject): CompletionItem {
    return {
        label: obj.identifier!.name,
        kind: CompletionItemKind.Variable,
        detail: obj.type,
        data: obj.identifier!.name,
    };
}

function getRelevantXvrs(
    curObj: SepticObject,
    xvrs: SepticObject[]
): SepticObject[] {
    let regex;
    if (["Mvr", "Tvr", "Evr", "Cvr", "Dvr"].includes(curObj.type)) {
        regex = `^Sopc${curObj.type.charAt(0)}vr`;
    } else if (
        ["SopcMvr", "SopcTvr", "SopcCvr", "SopcDvr", "SopcEvr"].includes(
            curObj.type
        )
    ) {
        regex = "^" + curObj.type.slice(4);
    } else if (curObj.type === "CalcPvr") {
        regex = "^[MTECD]vr";
    } else {
        return [];
    }
    let re = new RegExp(regex);
    return xvrs.filter((xvr) => re.test(xvr.type));
}
