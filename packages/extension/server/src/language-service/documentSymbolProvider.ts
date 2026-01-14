/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    DocumentSymbol,
    DocumentSymbolParams,
    SymbolKind,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "../configProvider";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    SepticCnfg,
    SepticObject,
    SepticMetaInfoProvider,
} from "@equinor/septic-config-lib";

interface SepticSymbol {
    symbol: DocumentSymbol;
    level: number;
    parent: SepticSymbol | undefined;
}

export class DocumentSymbolProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideDocumentSymbols(
        params: DocumentSymbolParams,
    ): Promise<DocumentSymbol[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        return getDocumentSymbols(cnfg);
    }
}

export function getDocumentSymbols(cnfg: SepticCnfg) {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const symbols = cnfg.objects.map((obj) => {
        const level = metaInfoProvider.getObjectDefault(obj.type).level;
        const symbolKind = metaInfoProvider.getObjectDefault(
            obj.type,
        ).symbolKind;
        return createSepticSymbol(obj, cnfg.doc, symbolKind, level);
    });

    const root = {
        level: -1,
        parent: undefined,
        symbol: dummySymbol(),
    };
    let parent;
    for (const symbol of symbols) {
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
    symbol: SepticSymbol,
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

    const end = parent.children[parent.children.length - 1].range.end;
    parent.range.end = end;
    parent.selectionRange.end = end;
}

function createSepticSymbol(
    obj: SepticObject,
    doc: TextDocument,
    symbol: string,
    level: number,
): SepticSymbol {
    const name = obj.type + ": " + obj.identifier?.name;
    const range = {
        start: doc.positionAt(obj.start),
        end: doc.positionAt(obj.end),
    };
    return {
        symbol: DocumentSymbol.create(
            name,
            undefined,
            toSymbolKind(symbol),
            range,
            range,
            [],
        ),
        level: level,
        parent: undefined,
    };
}

function toSymbolKind(name: string) {
    const nameLower = name.toLowerCase();
    switch (nameLower) {
        case "function":
            return SymbolKind.Function;
        case "namespace":
            return SymbolKind.Namespace;
        case "variable":
            return SymbolKind.Variable;
        case "array":
            return SymbolKind.Array;
        case "interface":
            return SymbolKind.Interface;
        default:
            return SymbolKind.Object;
    }
}

function dummySymbol(): DocumentSymbol {
    const range = {
        start: { character: 0, line: 0 },
        end: { character: 0, line: 0 },
    };
    return DocumentSymbol.create(
        "",
        undefined,
        SymbolKind.Array,
        range,
        range,
        [],
    );
}
