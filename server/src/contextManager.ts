/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, Emitter, Event } from "vscode-languageserver";
import { DocumentProvider } from "./documentProvider";
import * as YAML from "js-yaml";
import * as path from "path";
import * as protocol from "./protocol";
import { ScgConfig, ScgContext } from "./septic";
import { SepticConfigProvider } from "./language-service/septicConfigProvider";

export class ContextManager {
    private docProvider: DocumentProvider;

    private contexts: Map<string, ScgContext> = new Map<string, ScgContext>();

    private connection: Connection;

    private cnfgProvider: SepticConfigProvider;

    private _onDidUpdateContext: Emitter<string> = new Emitter<string>();

    public onDidUpdateContext: Event<string> = this._onDidUpdateContext.event;

    private _onDidDeleteContext: Emitter<string> = new Emitter<string>();

    public onDidDeleteContext: Event<string> = this._onDidDeleteContext.event;

    constructor(
        docProvider: DocumentProvider,
        cnfgProvider: SepticConfigProvider,
        connection: Connection
    ) {
        this.docProvider = docProvider;
        this.cnfgProvider = cnfgProvider;
        this.connection = connection;
        this.docProvider.onDidChangeDoc(async (uri) => {
            this.onDidChangeDoc(uri);
        });
        this.docProvider.onDidCreateDoc(async (uri) => {
            this.onDidChangeDoc(uri);
        });
        this.docProvider.onDidDeleteDoc((uri) => this.onDidDeleteDoc(uri));
    }
    public getAllContexts(): ScgContext[] {
        return Array.from(this.contexts.values());
    }

    public async getContext(uri: string): Promise<ScgContext | undefined> {
        for (let context of this.contexts.values()) {
            if (context.fileInContext(uri)) {
                return context;
            }
        }
        return undefined;
    }

    public getContextByName(uri: string): ScgContext | undefined {
        return this.contexts.get(uri);
    }

    private async onDidChangeDoc(uri: string) {
        if (path.extname(uri) !== ".yaml") {
            return;
        }
        const context = this.contexts.get(uri);
        if (!context) {
            this.createScgContext(uri);
            return;
        }

        const doc = await this.docProvider.getDocument(uri);
        if (!doc) {
            return;
        }
        console.log(`Starting update of context: ${context.name}`);

        try {
            await this.updateScgContext(uri);
        } catch (e) {
            console.log(
                `Error updating context ${context.name}. Removing context from manager!`
            );
            this.contexts.delete(context.name);
        }
        return;
    }

    private onDidDeleteDoc(uri: string) {
        const context = this.contexts.get(uri);
        if (context) {
            console.log(
                `Deleted file. Removing context ${context.name} from manager`
            );
            this.contexts.delete(uri);
            this._onDidDeleteContext.fire(uri);
        }
    }
    public async createScgContext(uri: string): Promise<void> {
        try {
            await this.updateScgContext(uri);
        } catch (e) {
            return;
        }
    }

    private async updateScgContext(uri: string): Promise<void> {
        const doc = await this.docProvider.getDocument(uri);
        if (!doc) {
            return;
        }
        const scgConfig = YAML.load(doc.getText()) as ScgConfig;
        const filesInTemplatePath = await this.connection.sendRequest(
            protocol.globFiles,
            {
                uri: path.parse(uri).dir + "/" + scgConfig.templatepath,
            }
        );
        const scgContext = new ScgContext(
            uri,
            uri,
            scgConfig,
            filesInTemplatePath,
            this.cnfgProvider
        );
        this.contexts.set(scgContext.name, scgContext);

        let loadDocuments = scgContext.files.map((f) => {
            this.docProvider.loadDocument(f);
        });

        await Promise.all(loadDocuments);
        console.log(`Updated context: ${uri}`);
        this._onDidUpdateContext.fire(scgContext.name);
    }
}
