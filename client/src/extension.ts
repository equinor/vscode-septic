/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as protocol from "./protocol";

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
        },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: "file", language: "septic" }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
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
        return (
            await vscode.workspace.findFiles("**/" + params.uri + "/**")
        ).map((f) => f.toString());
    });

    client.onRequest(protocol.findCnfgFilesInWorkspace, async () => {
        return (await vscode.workspace.findFiles(`**/*.cnfg`)).map((f) =>
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

    // Start the client. This will also launch the server
    client.start();
}
// this method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
