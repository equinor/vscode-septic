/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Should get diagnostics", () => {
    const docUri = getDocUri("diagnostics.cnfg");

    test("Diagnose basic test", async () => {
        await testDiagnostics(docUri, [
            {
                message: "",
                range: toRange(0, 0, 0, 3),
                severity: vscode.DiagnosticSeverity.Warning,
                source: "",
            },
        ]);
    });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    const start = new vscode.Position(sLine, sChar);
    const end = new vscode.Position(eLine, eChar);
    return new vscode.Range(start, end);
}

async function testDiagnostics(
    docUri: vscode.Uri,
    expectedDiagnostics: vscode.Diagnostic[]
) {
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

    expect(actualDiagnostics.length).to.equal(expectedDiagnostics.length);
}
