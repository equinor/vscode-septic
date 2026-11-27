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
import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticCnfg } from "@equinor/septic-config-lib";
import { ResourceMap } from "./util/resourceMap";
import { Lazy, lazy } from "./util/lazy";
import { DocumentProvider } from "./documentProvider";
import * as path from "path";

export interface ISepticConfigProvider {
    get(resource: URI): Promise<SepticCnfg | undefined>;
}

type GetValueFn = (
    document: TextDocument,
    token: CancellationToken,
) => Promise<SepticCnfg | undefined>;

async function getValueCnfg(
    document: TextDocument,
    token: CancellationToken,
): Promise<SepticCnfg | undefined> {
    const snapshot = TextDocument.create(
        document.uri,
        document.languageId,
        document.version,
        document.getText(),
    );
    const cnfg = new SepticCnfg(snapshot);
    await cnfg.parseAsync(token);
    return token.isCancellationRequested ? undefined : cnfg;
}

export class SepticConfigProvider implements ISepticConfigProvider {
    private readonly cache = new ResourceMap<{
        value: Lazy<Promise<SepticCnfg | undefined>>;
        cts: CancellationTokenSource;
    }>();

    private readonly loadingDocuments = new ResourceMap<
        Promise<TextDocument | undefined>
    >();
    private readonly revisions = new ResourceMap<number>();

    readonly getValue;

    private readonly docProvider: DocumentProvider;

    constructor(
        docProvider: DocumentProvider,
        getValue: GetValueFn = getValueCnfg,
    ) {
        this.getValue = getValue;
        this.docProvider = docProvider;

        docProvider.onDidChangeDoc(async (uri) => this.update(uri));
        docProvider.onDidCreateDoc(async (uri) => this.update(uri));
        docProvider.onDidLoadDoc(async (uri) => this.update(uri));
        docProvider.onDidDeleteDoc((uri) => {
            if (path.extname(uri) !== ".cnfg") {
                return;
            }
            this.bumpRevision(uri);
            this.invalidate(uri);
        });
    }

    public async get(resource: URI): Promise<SepticCnfg | undefined> {
        if (path.extname(resource) !== ".cnfg") {
            return undefined;
        }

        const existing = this.cache.get(resource);
        if (existing) {
            const cnfg = await existing.value.value;
            return this.cache.get(resource) === existing
                ? cnfg
                : this.get(resource);
        }
        const revision = this.revisions.get(resource);
        const doc = await this.loadDocument(resource);
        if (this.revisions.get(resource) !== revision) {
            return this.get(resource);
        }
        if (!doc) {
            return undefined;
        }
        if (!this.cache.has(resource)) {
            this.set(doc);
        }
        return this.get(resource);
    }

    private async update(uri: string) {
        if (path.extname(uri) !== ".cnfg") {
            return;
        }

        const revision = this.bumpRevision(uri);
        this.invalidate(uri);

        const doc = await this.loadDocument(uri);

        if (!doc || this.revisions.get(uri) !== revision) {
            return;
        }
        this.set(doc);
    }

    private bumpRevision(uri: string): number {
        const revision = (this.revisions.get(uri) ?? 0) + 1;
        this.revisions.set(uri, revision);
        return revision;
    }

    private set(doc: TextDocument) {
        const cts = new CancellationTokenSource();
        this.cache.set(doc.uri, {
            value: lazy<Promise<SepticCnfg | undefined>>(async () => {
                const cnfg = await this.getValue(doc, cts.token);
                return cnfg;
            }),
            cts: cts,
        });
    }

    private loadDocument(uri: string): Promise<TextDocument | undefined> {
        const exsisting = this.loadingDocuments.get(uri);
        if (exsisting) {
            return exsisting;
        }

        const p = this.docProvider.getDocument(uri);
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

