/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CancellationToken,
    DocumentSymbol,
    SymbolKind,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject, SepticMetaInfoProvider } from "../septic";

interface SepticSymbol {
    symbol: DocumentSymbol;
    level: number;
    parent: SepticSymbol | undefined;
}

export class DocumentSymbolProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    public provideDocumentSymbols(
        document: ITextDocument,
        token: CancellationToken | undefined
    ): DocumentSymbol[] {
        const cnfg = this.cnfgProvider.get(document.uri);
        if (!cnfg) {
            return [];
        }
        return getDocumentSymbols(document, cnfg);
    }
}

export function getDocumentSymbols(doc: ITextDocument, cnfg: SepticCnfg) {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let symbols = cnfg.objects.map((obj) => {
        const level = metaInfoProvider.getObjectDefault(obj.type).level;
        const symbolKind = metaInfoProvider.getObjectDefault(
            obj.type
        ).symbolKind;
        return createSepticSymbol(obj, doc, symbolKind, level);
    });

    let root = {
        level: -1,
        parent: undefined,
        symbol: dummySymbol(),
    };
    let parent;
    for (let symbol of symbols) {
        if (!parent) {
            parent = updateParent(root, symbol);
        } else {
            parent = updateParent(parent, symbol);
        }
    }

    root.symbol.children?.forEach((child) => {
        updateRange(child);
    });

    return root.symbol.children!;
}

function updateParent(
    parent: SepticSymbol,
    symbol: SepticSymbol
): SepticSymbol {
    while (parent && symbol.level <= parent.level) {
        parent = parent.parent!;
    }

    parent.symbol.children?.push(symbol.symbol);
    symbol.parent = parent;

    return symbol;
}

function updateRange(parent: DocumentSymbol) {
    if (!parent.children?.length) {
        return;
    }
    parent.children?.forEach((child) => {
        updateRange(child);
    });

    let end = parent.children[parent.children.length - 1].range.end;
    parent.range.end = end;
    parent.selectionRange.end = end;
}

function createSepticSymbol(
    obj: SepticObject,
    doc: ITextDocument,
    symbolKind: SymbolKind,
    level: number
): SepticSymbol {
    let name = obj.type + ": " + obj.identifier?.name;
    let range = {
        start: doc.positionAt(obj.start),
        end: doc.positionAt(obj.end),
    };
    return {
        symbol: DocumentSymbol.create(
            name,
            undefined,
            symbolKind,
            range,
            range,
            []
        ),
        level: level,
        parent: undefined,
    };
}

function dummySymbol(): DocumentSymbol {
    let range = {
        start: { character: 0, line: 0 },
        end: { character: 0, line: 0 },
    };
    return DocumentSymbol.create(
        "",
        undefined,
        SymbolKind.Array,
        range,
        range,
        []
    );
}
