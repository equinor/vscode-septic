/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CancellationToken,
    CancellationTokenSource,
    URI,
} from "vscode-languageserver";
import { SepticCnfg, parseSeptic } from "../septic";
import { ResourceMap } from "../util/resourceMap";
import { ITextDocument } from ".";
import { Lazy, lazy } from "../util/lazy";
import { DocumentProvider } from "../documentProvider";
import * as path from "path";

export interface ISepticConfigProvider {
    get(resource: URI): SepticCnfg | undefined;
}

type GetValueFn = (
    document: ITextDocument,
    token: CancellationToken
) => SepticCnfg;

function getValueCnfg(
    document: ITextDocument,
    token: CancellationToken
): SepticCnfg {
    const text = document.getText();

    let cnfg = parseSeptic(text, token);
    cnfg.setUri(document.uri);
    return cnfg;
}

export class SepticConfigProvider implements ISepticConfigProvider {
    private readonly cache = new ResourceMap<{
        value: Lazy<SepticCnfg>;
        cts: CancellationTokenSource;
    }>();

    readonly getValue;

    private readonly docProvider: DocumentProvider;

    constructor(
        docProvider: DocumentProvider,
        getValue: GetValueFn = getValueCnfg
    ) {
        this.getValue = getValue;
        this.docProvider = docProvider;

        docProvider.onDidChangeDoc(async (uri) => this.update(uri));
        docProvider.onDidCreateDoc(async (uri) => this.update(uri));
        docProvider.onDidLoadDoc(async (uri) => this.update(uri));
        docProvider.onDidDeleteDoc((uri) => this.onDidDelete(uri));
    }

    public get(resource: URI): SepticCnfg | undefined {
        let existing = this.cache.get(resource);
        if (existing) {
            return existing.value.value;
        }
        return undefined;
    }

    private async update(uri: string) {
        if (path.extname(uri) !== ".cnfg") {
            return;
        }
        const existing = this.cache.get(uri);
        if (existing) {
            existing.cts.cancel();
            existing.cts.dispose();
        }

        let cts = new CancellationTokenSource();

        const doc = await this.docProvider.getDocument(uri);

        if (!doc) {
            return;
        }
        this.cache.set(doc.uri, {
            value: lazy<SepticCnfg>(() => this.getValue(doc, cts.token)),
            cts: cts,
        });
    }

    private onDidDelete(resource: URI) {
        const entry = this.cache.get(resource);
        if (entry) {
            entry.cts.cancel();
            entry.cts.dispose();
            this.cache.delete(resource);
        }
    }
}
