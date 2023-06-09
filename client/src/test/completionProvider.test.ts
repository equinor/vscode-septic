/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Should get completion", () => {
    const docUri = getDocUri("completion.cnfg");

    test("Suggest corresponding SopcXvr name", async () => {
        await testCompletion(docUri, new vscode.Position(32, 19), {
            items: [
                { label: "TestCvr", kind: vscode.CompletionItemKind.Variable },
            ],
        });
    });
});

async function testCompletion(
    docUri: vscode.Uri,
    position: vscode.Position,
    expectedCompletion: vscode.CompletionList
) {
    await activate(docUri);
    const actualCompletion: vscode.CompletionList =
        await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            docUri,
            position
        );
    expect(actualCompletion.items.length).to.equal(
        expectedCompletion.items.length
    );
    expectedCompletion.items.forEach((expectedItem, i) => {
        const actualItem = actualCompletion.items[i];
        expect(actualItem.label).to.equal(expectedItem.label);
        expect(actualItem.kind).to.equal(expectedItem.kind);
    });
}
