/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Should get completion", () => {
    const docUri = getDocUri("completion/completion.cnfg");
    test("Suggest corresponding SopcXvr name", async () => {
        await testCompletion(docUri, new vscode.Position(6, 19), {
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
    const filteredCompletion = actualCompletion.items.filter(
        (item) => item.kind === vscode.CompletionItemKind.Variable
    );
    expect(filteredCompletion.length).to.equal(expectedCompletion.items.length);
    expectedCompletion.items.forEach((expectedItem, i) => {
        const actualItem = filteredCompletion[i];
        const label = actualItem.label as vscode.CompletionItemLabel
        expect(label.label).to.equal(expectedItem.label);
    });
}
