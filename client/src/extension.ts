/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";
import * as protocol from "./protocol";
import { getSearchPattern } from "./util";

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
    );

    let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "septic" }],
        synchronize: {
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/.clientrc"),
                vscode.workspace.createFileSystemWatcher("**/*.cnfg"),
                vscode.workspace.createFileSystemWatcher("**/*.yaml"),
            ],
        },
    };

    client = new LanguageClient(
        "septic",
        "Septic",
        serverOptions,
        clientOptions
    );
    client.onRequest(protocol.globFiles, async (params, cts) => {
        let folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return [];
        }
        let pattern = getSearchPattern(folder.uri.path, params.uri);
        return (await vscode.workspace.findFiles(pattern)).map((f) =>
            f.toString()
        );
    });

    client.onRequest(
        protocol.fsReadFile,
        async (e, token): Promise<number[]> => {
            const uri = vscode.Uri.parse(e.uri);
            return Array.from(await vscode.workspace.fs.readFile(uri));
        }
    );

    client.onRequest(protocol.findYamlFiles, async () => {
        return (await vscode.workspace.findFiles(`**/*.yaml`)).map((f) =>
            f.toString()
        );
    });

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
