/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, openDocument, activate } from "./helper";
import { expect } from "chai";
import { sleep } from "./helper";

suite("Test OPC-taglist command", async () => {
    setup(async () => {
        await vscode.commands.executeCommand(
            "workbench.action.closeAllEditors",
        );
        await activate();
        const files = await vscode.workspace.findFiles("**/opc_tags*");
        for (const file of files) {
            await vscode.workspace.fs.delete(file);
        }
    });

    teardown(async () => {
        await vscode.commands.executeCommand(
            "workbench.action.closeAllEditors",
        );
        const files = await vscode.workspace.findFiles("**/opc_tags*");
        for (const file of files) {
            await vscode.workspace.fs.delete(file);
        }
    });

    test("Get OPC taglist from SCG context", async () => {
        const commandPromise =
            vscode.commands.executeCommand("septic.opcTagList");
        await sleep(100);
        await vscode.commands.executeCommand(
            "workbench.action.acceptSelectedQuickOpenItem",
        );

        await commandPromise;
        await sleep(100);
        const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const expectedFileName = "opc_tags_scg.csv";
        const filePath = vscode.Uri.file(`${wsPath}/${expectedFileName}`);

        const fileExists = await vscode.workspace.fs.stat(filePath).then(
            () => true,
            () => false,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(fileExists).to.be.true;

        // Verify file content
        const fileContent = await vscode.workspace.fs.readFile(filePath);
        const contentStr = Buffer.from(fileContent).toString();
        expect(contentStr).to.include("Tag");
    });

    test("Get OPC taglist from standalone cnfg", async () => {
        await openDocument(getDocUri("test.cnfg"));
        const commandPromise =
            vscode.commands.executeCommand("septic.opcTagList");
        await sleep(100);
        await vscode.commands.executeCommand(
            "workbench.action.quickOpenSelectNext",
        ); // Move to second option
        await vscode.commands.executeCommand(
            "workbench.action.acceptSelectedQuickOpenItem",
        );

        await commandPromise;
        await sleep(100);
        const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const expectedFileName = "opc_tags_test.csv";
        const filePath = vscode.Uri.file(`${wsPath}/${expectedFileName}`);

        const fileExists = await vscode.workspace.fs.stat(filePath).then(
            () => true,
            () => false,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(fileExists).to.be.true;

        // Verify file content
        const fileContent = await vscode.workspace.fs.readFile(filePath);
        const contentStr = Buffer.from(fileContent).toString();
        expect(contentStr).to.include("Tag");
    });
});
