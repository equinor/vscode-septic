/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, openDocument, activate } from "./helper";
import { expect } from "chai";

suite("Test hover standalone", async () => {
	test("Hovering over system object", async () => {
		const docUri = getDocUri("test.cnfg");
		await testHover(docUri, new vscode.Position(0, 6), ["#### System", "Attributes:", "Parent object(s):"]);
	});
	test("Hovering over attribute", async () => {
		const docUri = getDocUri("test.cnfg");
		await testHover(docUri, new vscode.Position(12, 12), ["#### MeasTag", "Default:", "DataType:", "PublicProperty:"]);
	});
	test("Hovering over evr in calc", async () => {
		const docUri = getDocUri("test.cnfg");
		await testHover(docUri, new vscode.Position(151, 22), ["Evr: CalcEvr"]);
	});
	test("Hovering over function in calc", async () => {
		const docUri = getDocUri("test.cnfg");
		await testHover(docUri, new vscode.Position(151, 33), ["function abs(x)", "@param[in]", "@return", "@quality"]);
	});
});

suite("Test hover scg", async () => {
	test("Hovering over dmmy appl object", async () => {
		const docUri = getDocUri("scg/templates/21_DmmyAppl.cnfg");
		await testHover(docUri, new vscode.Position(0, 6), ["#### DmmyAppl", "Attributes:", "Parent object(s):"]);
	});
	test("Hovering over attribute", async () => {
		const docUri = getDocUri("scg/templates/32_SmpcApplWell.cnfg");
		await testHover(docUri, new vscode.Position(3, 12), ["#### Mode", "Default:", "DataType:", "PublicProperty:"]);
	});
	test("Hovering over evr in calc", async () => {
		const docUri = getDocUri("scg/templates/21_DmmyAppl.cnfg");
		await testHover(docUri, new vscode.Position(22, 25), ["Evr: Deadband{{Test}}"]);
	});
	test("Hovering over function in calc", async () => {
		const docUri = getDocUri("scg/templates/21_DmmyAppl.cnfg");
		await testHover(docUri, new vscode.Position(22, 50), ["function intpoltype1(", "@param[in]", "@return", "@quality"]);
	});
	test("Hovering over mvr reference", async () => {
		const docUri = getDocUri("scg/templates/62_DspGroupWell.cnfg");
		await testHover(docUri, new vscode.Position(14, 26), ["Mvr: D{{ Id }}Zpc", "Text1="]);
	});
});

async function testHover(
	docUri: vscode.Uri,
	position: vscode.Position,
	expectedContent: string[]
) {
	await activate();
	await openDocument(docUri);
	const hovers: vscode.Hover[] =
		await vscode.commands.executeCommand(
			"vscode.executeHoverProvider",
			docUri,
			position
		);
	expect(hovers.length).to.be.greaterThan(0);
	const content = hovers[0].contents[0] as vscode.MarkdownString;
	const text = content.value;
	expectedContent.forEach((expectedHover) =>
		expect(text).to.contain(expectedHover)
	);
}
