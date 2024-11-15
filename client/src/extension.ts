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
import { calcChat } from './chat';
import { generateCalc } from './lm';
import { FileTelemetrySender } from './logger';
import * as fs from 'fs';

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
    client.onRequest(protocol.globFiles, async (params) => {
        const parsedUri = vscode.Uri.parse(params.uri);
        const folder = vscode.workspace.getWorkspaceFolder(parsedUri);
        if (!folder) {
            return [];
        }
        const pattern = getSearchPattern(folder.uri.path, parsedUri.path);
        const files = await vscode.workspace.findFiles(pattern);
        return files
            .filter((f) => f.fsPath.includes(folder.uri.fsPath))
            .map((f) => f.toString());
    });

    client.onRequest(
        protocol.fsReadFile,
        async (e): Promise<number[]> => {
            const uri = vscode.Uri.parse(e.uri);
            return Array.from(await vscode.workspace.fs.readFile(uri));
        }
    );

    client.onRequest(protocol.findYamlFiles, async () => {
        return (await vscode.workspace.findFiles(`**/*.yaml`)).map((f) =>
            f.toString()
        );
    });

    vscode.commands.registerCommand("septic.detectCycles", async () => {
        const contexts = await client.sendRequest(protocol.contexts, {});
        const choice = await vscode.window.showQuickPick(contexts);
        if (!choice) {
            return;
        }
        const report = await client.sendRequest(protocol.cylceReport, {
            uri: choice,
        });
        if (!report) {
            vscode.window.showInformationMessage(
                `Not able to generate cycle report for ${choice}`
            );
        }
        const wsedit = new vscode.WorkspaceEdit();
        const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const filePath = vscode.Uri.file(wsPath + `/cycle_report.txt`);
        wsedit.createFile(filePath, {
            contents: Buffer.from(report),
            overwrite: true,
        });
        await vscode.workspace.applyEdit(wsedit);
        await vscode.window.showTextDocument(filePath, {
            preserveFocus: false,
        });
    });

    vscode.commands.registerCommand("septic.compareCnfg", async () => {
        const prevVersion = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { Septic: ["cnfg"] },
            title: "Select previous version",
        });
        if (!prevVersion) {
            return;
        }
        const currentVersion = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { Septic: ["cnfg"] },
            title: "Select current version",
        });
        if (!currentVersion) {
            return;
        }
        const possibleSettingsFiles = (
            await vscode.workspace.findFiles("*.yaml")
        ).map((item) => item.fsPath.toString());
        const settings = await vscode.window.showQuickPick(
            ["Default", ...possibleSettingsFiles],
            {
                title: "Select settings file",
                canPickMany: false,
            }
        );
        if (!settings) {
            return;
        }
        const diff = await client.sendRequest(protocol.compareCnfg, {
            prevVersion: prevVersion[0].toString(),
            currentVersion: currentVersion[0].toString(),
            settingsFile: settings,
        });
        if (!diff.length) {
            vscode.window.showInformationMessage(`No diff identified`);
            return;
        } else if (diff === "error") {
            vscode.window.showInformationMessage(
                "Not able to read settings file"
            );
            return;
        }
        const wsedit = new vscode.WorkspaceEdit();
        const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const filePath = vscode.Uri.file(wsPath + `/comparison.txt`);
        wsedit.createFile(filePath, {
            contents: Buffer.from(diff),
            overwrite: true,
        });
        await vscode.workspace.applyEdit(wsedit);
        await vscode.window.showTextDocument(filePath, {
            preserveFocus: false,
        });
    });

    vscode.commands.registerCommand("septic.opcTagList", async () => {
        const contexts = await client.sendRequest(protocol.contexts, {});
        const choice = await vscode.window.showQuickPick(contexts);
        if (!choice) {
            return;
        }
        const report = await client.sendRequest(protocol.opcTagList, {
            uri: choice,
        });
        if (!report) {
            vscode.window.showInformationMessage(
                `Not able to generate OPC tag list`
            );
        }
        const name = vscode.Uri.parse(choice)
            .path.split("/")
            .slice(-1)[0]
            .split(".")[0];
        const wsedit = new vscode.WorkspaceEdit();
        const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const filePath = vscode.Uri.file(wsPath + `/opc_tags_${name}.csv`);
        wsedit.createFile(filePath, {
            contents: Buffer.from(report),
            overwrite: true,
        });
        await vscode.workspace.applyEdit(wsedit);
        await vscode.window.showTextDocument(filePath, {
            preserveFocus: false,
        });
    });

    vscode.commands.registerCommand("septic.generateCalc", async (description: string, start: vscode.Position, end: vscode.Position) => {
        generateCalc(client, description, start, end);
    });
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
