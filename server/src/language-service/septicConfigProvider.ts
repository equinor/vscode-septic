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
    get(resource: URI): Promise<SepticCnfg | undefined>;
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

    private readonly loadingDocuments = new ResourceMap<
        Promise<ITextDocument | undefined>
    >();

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
        docProvider.onDidDeleteDoc((uri) => this.invalidate(uri));
    }

    public async get(resource: URI): Promise<SepticCnfg | undefined> {
        if (path.extname(resource) !== ".cnfg") {
            return undefined;
        }

        let existing = this.cache.get(resource);
        if (existing) {
            return existing.value.value;
        }
        const doc = await this.loadDocument(resource);
        if (!doc) {
            return undefined;
        }
        this.set(doc);
        return this.cache.get(resource)?.value.value;
    }

    private async update(uri: string) {
        if (path.extname(uri) !== ".cnfg") {
            return;
        }

        this.invalidate(uri);

        const doc = await this.loadDocument(uri);

        if (!doc) {
            return;
        }
        this.set(doc);
    }

    private set(doc: ITextDocument) {
        let cts = new CancellationTokenSource();
        this.cache.set(doc.uri, {
            value: lazy<SepticCnfg>(() => this.getValue(doc, cts.token)),
            cts: cts,
        });
    }

    private loadDocument(uri: string): Promise<ITextDocument | undefined> {
        let exsisting = this.loadingDocuments.get(uri);
        if (exsisting) {
            return exsisting;
        }

        let p = this.docProvider.getDocument(uri);
        p.finally(() => {
            this.loadingDocuments.delete(uri);
        });
        this.loadingDocuments.set(uri, p);
        return p;
    }

    private invalidate(uri: string) {
        const existing = this.cache.get(uri);
        if (existing) {
            existing.cts.cancel();
            existing.cts.dispose();
            this.cache.delete(uri);
        }
    }
}
