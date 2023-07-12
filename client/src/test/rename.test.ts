/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Renaming single file", async () => {
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

suite("Renaming SCG", async () => {
    const uris = [
        getDocUri("scg/templates/01_System.cnfg"),
        getDocUri("scg/templates/02_SopcProc.cnfg"),
        getDocUri("scg/templates/03_SopcProc_well.cnfg"),
        getDocUri("scg/templates/04_SmpcAppl.cnfg"),
        getDocUri("scg/templates/05_ExprModl_well.cnfg"),
        getDocUri("scg/templates/05_ExprModl.cnfg"),
        getDocUri("scg/templates/06_DspGroupTables.cnfg"),
        getDocUri("scg/templates/07_DspGroupTables_well.cnfg"),
        getDocUri("scg/templates/08_DmmyAppl.cnfg"),
        getDocUri("scg/templates/09_Calc.cnfg"),
    ];
    test("Renaming of SopcMvr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/03_SopcProc_well.cnfg"),
            uris,
            new vscode.Position(18, 24),
            5
        );
    });
    test("Renaming of Xvr in List", async () => {
        await testRenameContext(
            getDocUri("scg/templates/07_DspGroupTables_well.cnfg"),
            uris,
            new vscode.Position(10, 23),
            3
        );
    });
    test("Renaming of SopcCvr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/03_SopcProc_well.cnfg"),
            uris,
            new vscode.Position(0, 24),
            3
        );
    });
    test("Renaming of Evr", async () => {
        await testRenameContext(
            getDocUri("scg/templates/08_DmmyAppl.cnfg"),
            uris,
            new vscode.Position(8, 21),
            2
        );
    });
    test("Renaming of Evr in Calc", async () => {
        await testRenameContext(
            getDocUri("scg/templates/09_Calc.cnfg"),
            uris,
            new vscode.Position(7, 28),
            2
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

async function testRenameContext(
    docUri: vscode.Uri,
    contextUris: vscode.Uri[],
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
    const textEdits: vscode.TextEdit[] = [];
    contextUris.forEach((uri) => {
        textEdits.push(...workspaceEdit.get(uri));
    });
    expect(textEdits.length).to.equal(expectedNumEdits);
}
