import { Connection, URI } from "vscode-languageserver";
import { IWorkspace } from "./workspace";

export interface IContext {
    name: string;
    filePath: string;

    fileInContext(file: string): boolean;

    updateContext(): void;
}

class ScgContext implements IContext {
    public name: string;
    public filePath: string;
    private connection: Connection;

    private files: string[] = [];
    constructor(name: string, filePath: string, connection: Connection) {
        this.name = name;
        this.filePath = filePath;
        this.connection = connection;
        this.files.push(...this.findFiles());
    }

    private findFiles(): string[] {
        return [];
    }

    fileInContext(file: string): boolean {
        return this.files.includes(file);
    }

    updateContext(): void {
        return;
    }
}

class ContextManager {
    private connection: Connection;

    private contexts: Map<string, IContext> = new Map<string, IContext>();

    constructor(connection: Connection, workspace: IWorkspace) {
        this.connection = connection;

        workspace.onDidChangeYaml(async (e) => {
            this.onDidChangeContext(e);
        });
    }

    onDidChangeContext(e: URI) {
        let context = this.contexts.get(e);
        if (!context) {
            return;
        }
        context.updateContext();
    }
}
