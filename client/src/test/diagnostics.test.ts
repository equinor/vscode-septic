/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";


suite("Test diagnostics scg", async () => {
	let originalContentScgConfig: string;
	let configUri: vscode.Uri;

	setup(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		await activate();
		configUri = getDocUri("scg/scg.yaml");
		const doc = await vscode.workspace.openTextDocument(configUri);
		originalContentScgConfig = doc.getText();
	});

	teardown(async () => {
		// Restore original content regardless of test outcome
		try {
			const doc = await vscode.workspace.openTextDocument(configUri);
			const editor = await vscode.window.showTextDocument(doc);
			await editor.edit((eb) => {
				eb.replace(new vscode.Range(0, 0, doc.lineCount, 0), originalContentScgConfig);
			});
			await doc.save();
			await vscode.commands.executeCommand("workbench.action.closeAllEditors");
		} catch (error) {
			console.error("Failed to restore original content:", error);
		}
	});

	test("Diagnostics is updated when scg config is updated", async () => {
		const docUri = getDocUri("scg/templates/61_DspGroupTables.cnfg");
		const dependentDocUri = getDocUri("scg/templates/62_DspGroupWell.cnfg");

		// Initial diagnostics check
		const diagnosticsBeforeEdit = vscode.languages.getDiagnostics(docUri);
		expect(diagnosticsBeforeEdit.length).to.equal(0);
		const diagnosticsBeforeEditDependentFile = vscode.languages.getDiagnostics(dependentDocUri);
		expect(diagnosticsBeforeEditDependentFile.length).to.equal(0);

		const doc = await vscode.workspace.openTextDocument(configUri)
		const editor = await vscode.window.showTextDocument(doc);

		editor.edit((eb) => {
			eb.replace(new vscode.Range(21, 0, 22, 0), "");
		})

		await doc.save();
		// Wait for diagnostics to update
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Simulate editing the document to introduce an error
		const diagnosticsAfterEdit = vscode.languages.getDiagnostics(docUri);
		expect(diagnosticsAfterEdit.length).to.greaterThan(0);

		const diagnosticsAfterEditDependentFile = vscode.languages.getDiagnostics(dependentDocUri);
		expect(diagnosticsAfterEditDependentFile.length).to.greaterThan(0);
	});
});