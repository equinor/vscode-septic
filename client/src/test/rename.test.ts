/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Test renaming", async () => {
    test("Renaming of SopcXvr", async () => {
        await testRename(
            getDocUri("rename/xvr.cnfg"),
            new vscode.Position(0, 18),
            1
        );
    });
    test("Renaming of SopcXvr", async () => {
        await testRename(
            getDocUri("rename/sopcXvr.cnfg"),
            new vscode.Position(0, 20),
            2
        );
    });
    test("Renaming of Xvr in Calc", async () => {
        await testRename(
            getDocUri("rename/calc.cnfg"),
            new vscode.Position(0, 18),
            2
        );
    });
    test("Renaming of Xvr in list", async () => {
        await testRename(
            getDocUri("rename/xvrList.cnfg"),
            new vscode.Position(0, 18),
            2
        );
    });
    test("Not renaming of appl with same name", async () => {
        await testRename(
            getDocUri("rename/appl.cnfg"),
            new vscode.Position(3, 20),
            1
        );
    });
});

async function testRename(
    docUri: vscode.Uri,
    position: vscode.Position,
    expectedNumEdits: number
) {
    await activate(docUri);
    const workspaceEdit: vscode.WorkspaceEdit =
        await vscode.commands.executeCommand(
            "vscode.executeDocumentRenameProvider",
            docUri,
            position,
            "TestRename"
        );
    const textEdits = workspaceEdit.get(docUri);
    expect(textEdits.length).to.equal(expectedNumEdits);
}
