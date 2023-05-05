import { Connection } from "vscode-languageserver";
import { DocumentProvider } from "./documentProvider";
import * as YAML from "js-yaml";
import * as path from "path";
import * as protocol from "./protocol";

export interface IContext {
    name: string;
    filePath: string;

    fileInContext(file: string): boolean;
}

class ScgContext implements IContext {
    public name: string;
    public filePath: string;

    public files: string[];
    constructor(
        name: string,
        filePath: string,
        config: ScgConfig,
        filesInTemplateDir: string[]
    ) {
        this.name = name;
        this.filePath = filePath;

        this.files = this.getFiles(config, filesInTemplateDir);
    }

    fileInContext(file: string): boolean {
        return this.files.includes(file);
    }

    private getFiles(
        scgConfig: ScgConfig,
        filesInTemplateDir: string[]
    ): string[] {
        const files = [];
        for (const template of scgConfig.layout) {
            let found = false;
            for (const file of filesInTemplateDir) {
                if (template.name === path.basename(file)) {
                    files.push(file);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(
                    `Could not find template: ${template.name} in template dir for context ${this.name}`
                );
            }
        }
        return files;
    }
}

export class ContextManager {
    private docProvider: DocumentProvider;

    private contexts: Map<string, IContext> = new Map<string, IContext>();

    private connection: Connection;

    constructor(docProvider: DocumentProvider, connection: Connection) {
        this.docProvider = docProvider;
        this.connection = connection;
        this.docProvider.onDidChangeDoc(async (uri) => {
            this.onDidChangeDoc(uri);
        });
        this.docProvider.onDidCreateDoc(async (uri) => {
            this.onDidChangeDoc(uri);
        });
        this.docProvider.onDidDeleteDoc((uri) => this.onDidDeleteDoc(uri));
    }

    public getContext(uri: string): IContext | undefined {
        for (let context of this.contexts.values()) {
            if (context.fileInContext(uri)) {
                return context;
            }
        }
        return undefined;
    }

    private async onDidChangeDoc(uri: string) {
        const context = this.contexts.get(uri);
        if (context) {
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

        if (path.extname(uri) !== ".yaml") {
            return;
        }
        await this.createScgContext(uri);
    }

    private onDidDeleteDoc(uri: string) {
        const context = this.contexts.get(uri);
        if (context) {
            console.log(
                `Deleted file. Removing context ${context.name} from manager`
            );
            this.contexts.delete(uri);
        }
    }
    public async createScgContext(uri: string): Promise<void> {
        try {
            await this.updateScgContext(uri);
            console.log(`Created context: ${uri}`);
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
            { uri: scgConfig.templatepath }
        );
        const scgContext = new ScgContext(
            uri,
            uri,
            scgConfig,
            filesInTemplatePath
        );
        this.contexts.set(scgContext.name, scgContext);
    }
}

export interface ScgConfig {
    outputfile?: string;

    templatepath: string;

    verifycontent: boolean;

    adjustsspacing: boolean;

    sources: ScgSource[];

    layout: ScgTemplate[];
}

export interface ScgSource {
    filename: string;
    id: string;
    sheet: string;
}

export interface ScgTemplate {
    name: string;
    source?: string;
    include?: string[];
}
