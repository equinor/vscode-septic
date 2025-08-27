/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as protocol from "./protocol";
import { LanguageClient } from "vscode-languageclient/node";
import { generateCalc } from './lm';
import { ScgNode, ScgTreeItemType } from './scgTreeProvider';

export function registerCommandDetectCycles(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.detectCycles", async () => {
		const contexts = await client.sendRequest(protocol.contexts, {});
		const choice = await vscode.window.showQuickPick(contexts);
		if (!choice) {
			return;
		}
		const report = await client.sendRequest(protocol.cylceReport, {
			uri: choice,
		});
		if (!report) {
			vscode.window.showInformationMessage(
				`Not able to generate cycle report for ${choice}`
			);
		}
		const wsedit = new vscode.WorkspaceEdit();
		const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const filePath = vscode.Uri.file(wsPath + `/cycle_report.txt`);
		wsedit.createFile(filePath, {
			contents: Buffer.from(report),
			overwrite: true,
		});
		await vscode.workspace.applyEdit(wsedit);
		await vscode.window.showTextDocument(filePath, {
			preserveFocus: false,
		});
	});
}

export function registerCommandCompareCnfg(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.compareCnfg", async () => {
		const prevVersion = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: { Septic: ["cnfg"] },
			title: "Select previous version",
		});
		if (!prevVersion) {
			return;
		}
		const currentVersion = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: { Septic: ["cnfg"] },
			title: "Select current version",
		});
		if (!currentVersion) {
			return;
		}
		const possibleSettingsFiles = (
			await vscode.workspace.findFiles("*.yaml")
		).map((item) => item.fsPath.toString());
		const settings = await vscode.window.showQuickPick(
			["Default", ...possibleSettingsFiles],
			{
				title: "Select settings file",
				canPickMany: false,
			}
		);
		if (!settings) {
			return;
		}
		const diff = await client.sendRequest(protocol.compareCnfg, {
			prevVersion: prevVersion[0].toString(),
			currentVersion: currentVersion[0].toString(),
			settingsFile: settings,
		});
		if (!diff.length) {
			vscode.window.showInformationMessage(`No diff identified`);
			return;
		} else if (diff === "error") {
			vscode.window.showInformationMessage(
				"Not able to read settings file"
			);
			return;
		}
		const wsedit = new vscode.WorkspaceEdit();
		const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const filePath = vscode.Uri.file(wsPath + `/comparison.txt`);
		wsedit.createFile(filePath, {
			contents: Buffer.from(diff),
			overwrite: true,
		});
		await vscode.workspace.applyEdit(wsedit);
		await vscode.window.showTextDocument(filePath, {
			preserveFocus: false,
		});
	});
}

export function registerCommandOpcTagList(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.opcTagList", async () => {
		const contexts = await client.sendRequest(protocol.contexts, {});
		const choice = await vscode.window.showQuickPick(contexts);
		if (!choice) {
			return;
		}
		const report = await client.sendRequest(protocol.opcTagList, {
			uri: choice,
		});
		if (!report) {
			vscode.window.showInformationMessage(
				`Not able to generate OPC tag list`
			);
		}
		const name = vscode.Uri.parse(choice)
			.path.split("/")
			.slice(-1)[0]
			.split(".")[0];
		const wsedit = new vscode.WorkspaceEdit();
		const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const filePath = vscode.Uri.file(wsPath + `/opc_tags_${name}.csv`);
		wsedit.createFile(filePath, {
			contents: Buffer.from(report),
			overwrite: true,
		});
		await vscode.workspace.applyEdit(wsedit);
		await vscode.window.showTextDocument(filePath, {
			preserveFocus: false,
		});
	});
}

export function registerCommandAddTemplate() {
	vscode.commands.registerCommand('septic.scgtree.addTemplate', async (node: ScgNode) => {
		if (!node) {
			return;
		}
		const template = await vscode.window.showInputBox({
			placeHolder: "Enter template name"
		});
		const sources = (await node.config.getSources()).map(s => ({ label: s.id, value: s.id }));
		const source = await vscode.window.showQuickPick([{ label: 'No source', value: undefined }, ...sources]);
		if (!template || !source) {
			return;
		}
		const elementToInsertAfter = node.type === ScgTreeItemType.Template ? node.label : undefined;
		node.config.addTemplate(template, source.value, elementToInsertAfter);
		await node.config.save()
		const wsedit = new vscode.WorkspaceEdit();
		const filePath = vscode.Uri.file(node.config.templatepath + "/" + template);
		wsedit.createFile(filePath);
		await vscode.workspace.applyEdit(wsedit);
		await vscode.window.showTextDocument(filePath, {
			preserveFocus: false,
		});
	});
}

export function registerCommandGenerateCalc(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.generateCalc", async (description: string, start: vscode.Position, end: vscode.Position) => {
		generateCalc(client, description, start, end);
	});
}

export function registerCommands(context: vscode.ExtensionContext, client: LanguageClient) {
	registerCommandDetectCycles(context, client);
	registerCommandCompareCnfg(context, client);
	registerCommandOpcTagList(context, client);
	registerCommandGenerateCalc(context, client);
	registerCommandAddTemplate();
}


