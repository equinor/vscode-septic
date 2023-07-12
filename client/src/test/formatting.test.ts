/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples, vscode-python]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate, editor } from "./helper";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

suite("Test formatting", async () => {
    test("Renaming of SopcXvr", async () => {
        await testFormatting(
            getDocUri("formatting/original.cnfg"),
            path.join(__dirname, "fixtures", "formatting", "expected.cnfg")
        );
    });
});

async function testFormatting(docUri: vscode.Uri, expectedPath: string) {
    await activate(docUri);
    const edits: vscode.TextEdit[] = await vscode.commands.executeCommand(
        "vscode.executeFormatDocumentProvider",
        docUri,
        {}
    );
    await editor.edit((editBuilder) => {
        edits.forEach((edit) => editBuilder.replace(edit.range, edit.newText));
    });

    const actual = editor.document.getText();
    const expected = fs.readFileSync(expectedPath).toString();
    compareFiles(expected, actual);
}

function compareFiles(expectedContent: string, actualContent: string) {
    const expectedLines = expectedContent.split(/\r?\n/);
    const actualLines = actualContent.split(/\r?\n/);

    for (
        let i = 0;
        i < Math.min(expectedLines.length, actualLines.length);
        i += 1
    ) {
        const e = expectedLines[i];
        const a = actualLines[i];
        expect(e, `Difference at line ${i}`).to.be.equal(a);
    }

    expect(
        actualLines.length,
        expectedLines.length > actualLines.length
            ? "Actual contains more lines than expected"
            : "Expected contains more lines than the actual"
    ).to.be.equal(expectedLines.length);
}
