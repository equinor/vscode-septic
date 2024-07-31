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
        let parsedUri = vscode.Uri.parse(params.uri);
        let folder = vscode.workspace.getWorkspaceFolder(parsedUri);
        if (!folder) {
            return [];
        }
        let pattern = getSearchPattern(folder.uri.path, parsedUri.path);
        let files = await vscode.workspace.findFiles(pattern);
        return files
            .filter((f) => f.fsPath.includes(folder.uri.fsPath))
            .map((f) => f.toString());
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

    vscode.commands.registerCommand("septic.detectCycles", async () => {
        let contexts = await client.sendRequest(protocol.contexts, {});
        let choice = await vscode.window.showQuickPick(contexts);
        if (!choice) {
            return;
        }
        let report = await client.sendRequest(protocol.cylceReport, {
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
        let contexts = await client.sendRequest(protocol.contexts, {});
        let prevVersion = await vscode.window.showQuickPick(contexts, {
            title: "Select previous version of cnfg",
            canPickMany: false,
        });
        if (!prevVersion) {
            return;
        }
        contexts = contexts.filter((item) => item !== prevVersion);
        let currentVersion = await vscode.window.showQuickPick(contexts, {
            title: "Select current version of cnfg",
            canPickMany: false,
        });
        if (!currentVersion) {
            return;
        }
        vscode.window.showInformationMessage(
            `You picked prev version ${prevVersion} and current version ${currentVersion}`
        );
    });

    vscode.commands.registerCommand("septic.opcTagList", async () => {
        let contexts = await client.sendRequest(protocol.contexts, {});
        let choice = await vscode.window.showQuickPick(contexts);
        if (!choice) {
            return;
        }
        let report = await client.sendRequest(protocol.opcTagList, {
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

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
