/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from "vscode-jsonrpc";
import { ITextDocument } from "./language-service";
import { ResourceMap } from "./util";
import {
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
import { SettingsManager } from "./settings";

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
    private decoderUTF8 = new TextDecoder("utf-8");
    private decoderWindows1252 = new TextDecoder("windows-1252");

    readonly _onDidChangeDoc = new Emitter<URI>();

    readonly onDidChangeDoc = this._onDidChangeDoc.event;

    readonly _onDidCreateDoc = new Emitter<URI>();

    readonly onDidCreateDoc = this._onDidCreateDoc.event;

    readonly _onDidDeleteDoc = new Emitter<URI>();

    readonly onDidDeleteDoc = this._onDidDeleteDoc.event;

    readonly _onDidLoadDoc = new Emitter<URI>();

    readonly onDidLoadDoc = this._onDidLoadDoc.event;

    readonly settingsManager: SettingsManager;

    constructor(
        connection: Connection,
        documents: TextDocuments<TextDocument>,
        settingsManager: SettingsManager
    ) {
        this.connection = connection;
        this.documents = documents;
        this.settingsManager = settingsManager;

        this.documents.onDidChangeContent((e) => {
            if (!this.isRelevantFile(e.document.uri)) {
                return;
            }
            const doc = this.cache.get(e.document.uri);
            if (doc) {
                doc.setInMemoryDoc(e.document);
                this._onDidChangeDoc.fire(e.document.uri);
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
                this._onDidDeleteDoc.fire(doc.uri);
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
            this._onDidChangeDoc.fire(e.document.uri);
        });

        connection.onDidChangeWatchedFiles(async (parms) => {
            for (const change of parms.changes) {
                if (!this.isRelevantFile(change.uri)) {
                    continue;
                }
                switch (change.type) {
                    case FileChangeType.Created: {
                        const doc = this.cache.get(change.uri);
                        if (!doc) {
                            await this.openDocumentFromFs(change.uri);
                        }
                        this._onDidCreateDoc.fire(change.uri);
                        break;
                    }
                    case FileChangeType.Changed: {
                        const doc = this.cache.get(change.uri);
                        if (doc) {
                            await this.openDocumentFromFs(change.uri);
                        }
                        this._onDidChangeDoc.fire(change.uri);
                        break;
                    }
                    case FileChangeType.Deleted: {
                        const doc = this.cache.get(change.uri);
                        if (doc) {
                            doc.setOnDiskDoc(undefined);
                            if (doc.isDetached()) {
                                this.cache.delete(doc.uri);
                                this._onDidDeleteDoc.fire(doc.uri);
                            }
                        }
                        break;
                    }
                }
            }
        });
    }

    public getAllDocumentUris(): string[] {
        return this.cache.keys();
    }

    public async getDocument(uri: string): Promise<ITextDocument | undefined> {
        const doc = this.cache.get(uri);
        if (doc) {
            return doc;
        }
        const matchingDoc = this.documents.get(uri);
        if (matchingDoc) {
            const doc = new Document(uri, { inMemoryDoc: matchingDoc });
            this.cache.set(uri, doc);
            return doc;
        }
        return this.openDocumentFromFs(uri);
    }

    public async loadDocument(uri: string): Promise<void> {
        if (this.cache.has(uri)) {
            return;
        }
        const doc = await this.openDocumentFromFs(uri);
        if (doc) {
            this._onDidLoadDoc.fire(uri);
        }
    }

    private async openDocumentFromFs(
        uri: string
    ): Promise<Document | undefined> {
        try {
            const encodedContent = await this.connection.sendRequest(
                protocol.fsReadFile,
                {
                    uri: uri,
                }
            );
            const bytes = new Uint8Array(encodedContent);
            const settings = await this.settingsManager.getSettings();
            const encoding = settings?.encoding ?? "windows1252";
            let content: string;
            if (encoding === "utf8") {
                content = this.decoderUTF8.decode(bytes);
            } else {
                content = this.decoderWindows1252.decode(bytes);
            }
            const doc = new Document(uri, {
                onDiskDoc: TextDocument.create(uri, "septic", 0, content),
            });
            this.cache.set(uri, doc);
            return doc;
        } catch {
            return undefined;
        }
    }

    private isRelevantFile(uri: string): boolean {
        return path.extname(uri) === ".cnfg" || path.extname(uri) === ".yaml";
    }
}
