/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, openDocument, activate } from "./helper";
import { expect } from "chai";

suite("Renaming single file", async () => {
    setup(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await activate();
    });
    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
    test("Renaming of SopcCvr", async () => {
        await testRename(
            getDocUri("test.cnfg"),
            new vscode.Position(39, 21),
            3
        );
    });
    test("Renaming of Evr in Calc", async () => {
        await testRename(
            getDocUri("test.cnfg"),
            new vscode.Position(151, 21),
            2
        );
    });
    test("Renaming of Mvr in list", async () => {
        await testRename(
            getDocUri("test.cnfg"),
            new vscode.Position(278, 24),
            4
        );
    });
    test("Renaming of Tvr", async () => {
        await testRename(
            getDocUri("test.cnfg"),
            new vscode.Position(83, 23),
            3
        );
    });
});

suite("Renaming SCG", async () => {
    const uris = [
        getDocUri("scg/templates/01_System.cnfg"),
        getDocUri("scg/templates/11_SopcProc.cnfg"),
        getDocUri("scg/templates/12_SopcProcWell.cnfg"),
        getDocUri("scg/templates/21_DmmyAppl.cnfg"),
        getDocUri("scg/templates/31_SmpcAppl.cnfg"),
        getDocUri("scg/templates/32_SmpcApplWell.cnfg"),
        getDocUri("scg/templates/41_ExprModl.cnfg"),
        getDocUri("scg/templates/61_DspGroupTables.cnfg"),
        getDocUri("scg/templates/62_DspGroupWell.cnfg"),
    ];
    test("Renaming of SopcMvr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/12_SopcProcWell.cnfg"),
            uris,
            new vscode.Position(18, 24),
            3
        );
    });
    test("Renaming of Xvr in List", async () => {
        await testRenameContext(
            getDocUri("scg/templates/62_DspGroupWell.cnfg"),
            uris,
            new vscode.Position(10, 23),
            3
        );
    });
    test("Renaming of SopcCvr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/12_SopcProcWell.cnfg"),
            uris,
            new vscode.Position(0, 24),
            3
        );
    });
    test("Renaming of Evr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/21_DmmyAppl.cnfg"),
            uris,
            new vscode.Position(7, 21),
            3
        );
    });
    test("Renaming of Evr in Calc", async () => {
        await testRenameContext(
            getDocUri("scg/templates/21_DmmyAppl.cnfg"),
            uris,
            new vscode.Position(22, 28),
            2
        );
    });
});

async function testRename(
    docUri: vscode.Uri,
    position: vscode.Position,
    expectedNumEdits: number
) {
    await openDocument(docUri);
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

async function testRenameContext(
    docUri: vscode.Uri,
    contextUris: vscode.Uri[],
    position: vscode.Position,
    expectedNumEdits: number
) {
    await openDocument(docUri);
    const workspaceEdit: vscode.WorkspaceEdit =
        await vscode.commands.executeCommand(
            "vscode.executeDocumentRenameProvider",
            docUri,
            position,
            "TestRename"
        );
    const textEdits: vscode.TextEdit[] = [];
    contextUris.forEach((uri) => {
        textEdits.push(...workspaceEdit.get(uri));
    });
    expect(textEdits.length).to.equal(expectedNumEdits);
}
