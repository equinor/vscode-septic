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
import { calcChat } from './chat';
import { FileTelemetrySender } from './logger';
import * as fs from 'fs';
import { registerAllCommands } from './commands';
import { registerRequestHandlers } from "./requests";

let client: LanguageClient;



export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
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

    registerAllCommands(context, client);
    registerRequestHandlers(client);

    if (!fs.existsSync(context.logUri.fsPath)) {
        fs.mkdirSync(context.logUri.fsPath);
    }
    const chatLogFilePath = path.join(context.logUri.fsPath, 'chat.log');
    const sender = new FileTelemetrySender(chatLogFilePath);
    const chatLogger = vscode.env.createTelemetryLogger(sender);

    const chatHandler: vscode.ChatRequestHandler = async (request, context, stream, token): Promise<vscode.ChatResult | void> => {
        chatLogger.logUsage('chat', { command: request.command });
        if (request.command === 'calcs') {
            return await calcChat(client, request, context, stream, token);
        }
        return;
    };
    const septicChat = vscode.chat.createChatParticipant("septic.chat", chatHandler);

    const iconPathDark = vscode.Uri.joinPath(context.extensionUri, "images/septic_dark.svg");
    const iconPathLight = vscode.Uri.joinPath(context.extensionUri, "images/septic_light.svg");
    septicChat.iconPath = { light: iconPathLight, dark: iconPathDark };

    septicChat.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
        chatLogger.logUsage('chatResultFeedback', { result: feedback.result, kind: feedback.kind });
    });

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
