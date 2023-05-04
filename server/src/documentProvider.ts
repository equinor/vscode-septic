import { CancellationToken } from "vscode-jsonrpc";
import { ITextDocument } from "./language-service";
import { ResourceMap, Lazy } from "./util";
import { IWorkspace } from "./workspace";
import { Connection } from "vscode-languageserver";
import * as protocol from "./protocol";

export class DocumentProvider {
    private readonly cache = new ResourceMap<{
        value: Lazy<ITextDocument>;
        cts: CancellationToken;
    }>();

    private readonly connection: Connection;

    constructor(workspace: IWorkspace, connection: Connection) {
        this.connection = connection;
    }

    public getDocument(uri: string) {
        const doc = this.cache.get(uri);
        if (doc) {
            return doc;
        }
        this.connection.sendRequest(pr);
    }
}
