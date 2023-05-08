import { Connection } from "vscode-languageserver";
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

    public async getContext(uri: string): Promise<ScgContext | undefined> {
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
            filesInTemplatePath,
            this.cnfgProvider
        );
        this.contexts.set(scgContext.name, scgContext);

        let loadDocuments = scgContext.files.map((f) => {
            this.docProvider.loadDocument(f);
        });

        await Promise.all(loadDocuments);
        console.log(`Updated context: ${uri}`);
    }
}
