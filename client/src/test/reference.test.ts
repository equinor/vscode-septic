/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Test references SCG-context", async () => {
    test("Reference Mvr", async () => {
        await testReference(
            getDocUri("scg/templates/03_SopcProc_well.cnfg"),
            new vscode.Position(18, 24),
            5
        );
    });
    test("Reference Cvr", async () => {
        await testReference(
            getDocUri("scg/templates/03_SopcProc_well.cnfg"),
            new vscode.Position(0, 24),
            3
        );
    });
    test("Reference Evr", async () => {
        await testReference(
            getDocUri("scg/templates/08_DmmyAppl.cnfg"),
            new vscode.Position(8, 21),
            2
        );
    });
    test("Reference Evr", async () => {
        await testReference(
            getDocUri("scg/templates/09_Calc.cnfg"),
            new vscode.Position(7, 28),
            2
        );
    });
});

async function testReference(
    docUri: vscode.Uri,
    position: vscode.Position,
    expectedNumLocations: number
) {
    await activate(docUri);
    const locations: vscode.Location[] = await vscode.commands.executeCommand(
        "vscode.executeReferenceProvider",
        docUri,
        position
    );
    expect(locations.length).to.equal(expectedNumLocations);
}
