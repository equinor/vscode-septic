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
import { ApplicationTreeProvider, JinjaVariablesTreeProvider } from './treeProviders';
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
    const applicationsTreeProvider = new ApplicationTreeProvider(appManager);
    const jinjaVariablesTreeProvider = new JinjaVariablesTreeProvider(appManager);
    vscode.window.registerTreeDataProvider('septic-applications', applicationsTreeProvider);
    vscode.window.registerTreeDataProvider('septic-scg-variables', jinjaVariablesTreeProvider);
    vscode.window.onDidChangeActiveTextEditor((e) => {
        if (!e) {
            return;
        }
        applicationsTreeProvider.refresh();
        jinjaVariablesTreeProvider.refresh();
    })
    vscode.workspace.onDidSaveTextDocument((e) => {
        if (path.extname(e.fileName) === '.yaml' || path.extname(e.fileName) === '.yml') {
            appManager.updateScgConfig(e.fileName);
        }
    })
    registerChatTools(context, client)
    registerCommands(context, client, applicationsTreeProvider, appManager);
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
