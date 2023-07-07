/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from "vscode-jsonrpc";
import { ITextDocument } from "./language-service";
import { ResourceMap } from "./util";
import {
    CancellationToken,
    Connection,
    FileChangeType,
    TextDocuments,
    URI,
} from "vscode-languageserver";
import * as protocol from "./protocol";
import {
    Position,
    Range,
    TextDocument,
} from "vscode-languageserver-textdocument";
import * as path from "path";
import { TextDecoder } from "util";
import { CancellationTokenManager } from "./cancellationManager";

class Document implements ITextDocument {
    private inMemoryDoc?: ITextDocument;
    private onDiskDoc?: ITextDocument;

    readonly uri: string;
    readonly version: number = 0;
    readonly lineCount: number = 0;

    constructor(uri: string, init: { inMemoryDoc: ITextDocument });
    constructor(uri: string, init: { onDiskDoc: ITextDocument });
    constructor(
        uri: string,
        init: {
            inMemoryDoc: ITextDocument;
            onDiskDoc: ITextDocument;
        }
    ) {
        this.uri = uri;
        this.inMemoryDoc = init?.inMemoryDoc;
        this.onDiskDoc = init?.onDiskDoc;
    }

    getText(range?: Range): string {
        if (this.inMemoryDoc) {
            return this.inMemoryDoc.getText(range);
        }

        if (this.onDiskDoc) {
            return this.onDiskDoc.getText(range);
        }

        throw new Error("Document has been closed");
    }

    positionAt(offset: number): Position {
        if (this.inMemoryDoc) {
            return this.inMemoryDoc.positionAt(offset);
        }

        if (this.onDiskDoc) {
            return this.onDiskDoc.positionAt(offset);
        }

        throw new Error("Document has been closed");
    }

    offsetAt(position: Position): number {
        if (this.inMemoryDoc) {
            return this.inMemoryDoc.offsetAt(position);
        }

        if (this.onDiskDoc) {
            return this.onDiskDoc.offsetAt(position);
        }

        throw new Error("Document has been closed");
    }

    hasInMemoryDoc(): boolean {
        return !!this.inMemoryDoc;
    }

    isDetached(): boolean {
        return !this.onDiskDoc && !this.inMemoryDoc;
    }

    setInMemoryDoc(doc: TextDocument | undefined) {
        this.inMemoryDoc = doc;
    }

    setOnDiskDoc(doc: TextDocument | undefined) {
        this.onDiskDoc = doc;
    }
}

export class DocumentProvider {
    private readonly cache = new ResourceMap<Document>();
    private readonly documents: TextDocuments<TextDocument>;
    private readonly connection: Connection;
    private decoder = new TextDecoder("utf-8");
    private tokenManager: CancellationTokenManager =
        new CancellationTokenManager();

    readonly _onDidChangeDoc = new Emitter<{
        uri: URI;
        token: CancellationToken;
    }>();

    readonly onDidChangeDoc = this._onDidChangeDoc.event;

    readonly _onDidCreateDoc = new Emitter<{
        uri: URI;
        token: CancellationToken;
    }>();

    readonly onDidCreateDoc = this._onDidCreateDoc.event;

    readonly _onDidDeleteDoc = new Emitter<{
        uri: URI;
        token: CancellationToken;
    }>();

    readonly onDidDeleteDoc = this._onDidDeleteDoc.event;

    readonly _onDidLoadDoc = new Emitter<{
        uri: URI;
        token: CancellationToken;
    }>();

    readonly onDidLoadDoc = this._onDidLoadDoc.event;

    constructor(
        connection: Connection,
        documents: TextDocuments<TextDocument>
    ) {
        this.connection = connection;
        this.documents = documents;

        this.documents.onDidChangeContent((e) => {
            if (!this.isRelevantFile(e.document.uri)) {
                return;
            }
            const doc = this.cache.get(e.document.uri);
            if (doc) {
                doc.setInMemoryDoc(e.document);
                this.fireOnDidChangeDoc(e.document.uri);
            }
        });

        this.documents.onDidClose((e) => {
            if (!this.isRelevantFile(e.document.uri)) {
                return;
            }
            const doc = this.cache.get(e.document.uri);
            if (!doc) {
                return;
            }

            doc.setInMemoryDoc(undefined);
            if (doc.isDetached()) {
                this.cache.delete(doc.uri);
                this.fireOnDidDeleteDoc(doc.uri);
            }
        });

        this.documents.onDidOpen((e) => {
            if (!this.isRelevantFile(e.document.uri)) {
                return;
            }
            const doc = this.cache.get(e.document.uri);
            if (doc) {
                doc.setInMemoryDoc(e.document);
            } else {
                this.cache.set(
                    e.document.uri,
                    new Document(e.document.uri, { inMemoryDoc: e.document })
                );
            }
            this.fireOnDidChangeDoc(e.document.uri);
        });

        connection.onDidChangeWatchedFiles(async (params) => {
            for (const change of params.changes) {
                if (!this.isRelevantFile(change.uri)) {
                    continue;
                }
                switch (change.type) {
                    case FileChangeType.Created: {
                        const doc = this.cache.get(change.uri);
                        if (!doc) {
                            await this.openDocumentFromFs(change.uri);
                        }
                        this.fireOnDidCreateDoc(change.uri);
                        break;
                    }
                    case FileChangeType.Changed: {
                        const doc = this.cache.get(change.uri);
                        if (doc) {
                            await this.openDocumentFromFs(change.uri);
                        }
                        this.fireOnDidChangeDoc(change.uri);
                        break;
                    }
                    case FileChangeType.Deleted: {
                        const doc = this.cache.get(change.uri);
                        if (doc) {
                            doc.setOnDiskDoc(undefined);
                            if (doc.isDetached()) {
                                this.cache.delete(doc.uri);
                                this.fireOnDidDeleteDoc(doc.uri);
                            }
                        }
                        break;
                    }
                }
            }
        });
    }

    public async getDocument(uri: string): Promise<ITextDocument | undefined> {
        const doc = this.cache.get(uri);
        if (doc) {
            return doc;
        }
        const matchingDoc = this.documents.get(uri);
        if (matchingDoc) {
            let doc = new Document(uri, { inMemoryDoc: matchingDoc });
            this.cache.set(uri, doc);
            return doc;
        }
        return this.openDocumentFromFs(uri);
    }

    public async loadDocument(uri: string): Promise<void> {
        if (this.cache.has(uri)) {
            return;
        }
        let doc = await this.openDocumentFromFs(uri);
        if (doc) {
            this.fireOnDidLoadDoc(uri);
        }
    }

    private async openDocumentFromFs(
        uri: string
    ): Promise<Document | undefined> {
        try {
            const content = await this.connection.sendRequest(
                protocol.fsReadFile,
                {
                    uri: uri,
                }
            );
            const utf8bytes = new Uint8Array(content);
            const contentString = this.decoder.decode(utf8bytes);
            const doc = new Document(uri, {
                onDiskDoc: TextDocument.create(uri, "septic", 0, contentString),
            });
            this.cache.set(uri, doc);
            return doc;
        } catch (e) {
            return undefined;
        }
    }

    private isRelevantFile(uri: string): boolean {
        return path.extname(uri) === ".cnfg" || path.extname(uri) === ".yaml";
    }

    private fireOnDidChangeDoc(uri: URI) {
        this.tokenManager.cancel(uri);
        this._onDidChangeDoc.fire({
            token: this.tokenManager.token(uri),
            uri: uri,
        });
    }

    private fireOnDidCreateDoc(uri: URI) {
        this.tokenManager.cancel(uri);
        this._onDidCreateDoc.fire({
            token: this.tokenManager.token(uri),
            uri: uri,
        });
    }

    private fireOnDidDeleteDoc(uri: URI) {
        this.tokenManager.cancel(uri);
        this._onDidDeleteDoc.fire({
            token: this.tokenManager.token(uri),
            uri: uri,
        });
    }

    private fireOnDidLoadDoc(uri: URI) {
        this.tokenManager.cancel(uri);
        this._onDidLoadDoc.fire({
            token: this.tokenManager.token(uri),
            uri: uri,
        });
    }
}
