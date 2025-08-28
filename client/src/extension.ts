/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";
import { registerCommands } from './commands';
import { registerRequestHandlers } from "./requests";
import { registerChatTools } from './tools';
import { registerSepticChatParticipant } from './chatParticipant';
import { ScgTreeProvider, JinjaVariablesTreeProvider } from './treeProviders';
import { SepticApplicationManager } from './applicationManager';

let client: LanguageClient;



export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(
        path.join("dist", "server.js")
    );

    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
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
    const appManager = new SepticApplicationManager(context);
    const scgProjectProvider = new ScgTreeProvider(appManager);
    const jinjaVariablesProvider = new JinjaVariablesTreeProvider(appManager);
    vscode.window.registerTreeDataProvider('septic-scg', scgProjectProvider);
    vscode.window.registerTreeDataProvider('septic-scg-variables', jinjaVariablesProvider);
    vscode.window.onDidChangeActiveTextEditor((e) => {
        if (!e) {
            return;
        }
        scgProjectProvider.refresh();
        jinjaVariablesProvider.refresh();
    })
    registerChatTools(context, client)
    registerCommands(context, client, scgProjectProvider);
    registerRequestHandlers(client);
    registerSepticChatParticipant(context, client)
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
