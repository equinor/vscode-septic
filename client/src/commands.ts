/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as protocol from "./protocol";
import * as path from "path";
import { LanguageClient } from "vscode-languageclient/node";
import { generateCalc } from './lm';
import { ApplicationTreeItem, ApplicationTreeItemType, ApplicationTreeProvider, SepticFunctionTreeProvider } from './treeProviders';
import { SepticApplicationManager } from './applicationManager';
import { createMdfWebviewPanel } from './webviews';

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

export function registerCommandAddTemplate(scgTreeProvider: ApplicationTreeProvider) {
	vscode.commands.registerCommand('septic.scgtree.addTemplate', async (node: ApplicationTreeItem) => {
		if (!node) {
			return;
		}
		const template = await vscode.window.showInputBox({
			placeHolder: "Enter template name"
		});
		const sources = (await node.config.getSources()).map(s => ({ label: s.id, value: s.id }));
		const source = await vscode.window.showQuickPick([{ label: 'No source', value: undefined }, ...sources], { title: "Select source for template" });
		if (!template || !source) {
			return;
		}
		const elementToInsertAfter = node.type === ApplicationTreeItemType.Template ? node.label : undefined;
		node.config.addTemplate(template, source.value, elementToInsertAfter);
		await node.config.save()
		const wsedit = new vscode.WorkspaceEdit();
		const filePath = vscode.Uri.file(node.config.templatepath + "/" + template);
		wsedit.createFile(filePath);
		await vscode.workspace.applyEdit(wsedit);
		await vscode.window.showTextDocument(filePath, {
			preserveFocus: false,
		});
		scgTreeProvider.refresh();
	});
}

export function registerCommandRemoveTemplate(applicationTreeProvider: ApplicationTreeProvider) {
	vscode.commands.registerCommand('septic.scgtree.removeTemplate', async (node: ApplicationTreeItem) => {
		if (!node) {
			return;
		}
		const confirmation = await vscode.window.showQuickPick([{ label: 'No', value: false, picked: true }, { label: 'Yes', value: true }], { title: "Confirm removal" });
		if (!confirmation || !confirmation.value) {
			return;
		}
		node.config.removeTemplate(node.label);
		await node.config.save()
		applicationTreeProvider.refresh();
	});
}

export function registerCommandRenameTemplate(applicationTreeProvider: ApplicationTreeProvider) {
	vscode.commands.registerCommand('septic.scgtree.renameTemplate', async (node: ApplicationTreeItem) => {
		if (!node) {
			return;
		}
		const newName = await vscode.window.showInputBox({ prompt: "Enter new template name", value: node.label });
		if (!newName) {
			return;
		}
		await vscode.workspace.fs.rename(vscode.Uri.file(node.config.templatepath + "/" + node.label), vscode.Uri.file(node.config.templatepath + "/" + newName), { overwrite: false });
		node.config.renameTemplate(node.label, newName);
		await node.config.save()
		applicationTreeProvider.refresh();
	});
}


export function registerCommandAddSource(applicationTreeProvider: ApplicationTreeProvider) {
	vscode.commands.registerCommand('septic.scgtree.addSource', async (node: ApplicationTreeItem) => {
		if (!node) {
			return;
		}
		const newName = await vscode.window.showInputBox({ prompt: "Enter new source name" });
		if (!newName) {
			return;
		}
		const fileName = await vscode.window.showInputBox({ prompt: "Enter source file name (with path relative to scg folder)" });
		if (!fileName) {
			return;
		}
		if (!fileName.endsWith(".csv")) {
			vscode.window.showErrorMessage("Source file must be a CSV file");
			return;
		}
		const fileUri = vscode.Uri.file(path.join(path.dirname(node.config.path), fileName));
		const dirUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
		await vscode.workspace.fs.createDirectory(dirUri);
		const dummyContent = new TextEncoder().encode("Dummy;Content\n");
		await vscode.workspace.fs.writeFile(fileUri, dummyContent);
		node.config.addSource(newName, fileName);
		await node.config.save()
		applicationTreeProvider.refresh();
	});
}

export function registerCommandRefreshApplications(applicationManager: SepticApplicationManager) {
	vscode.commands.registerCommand('septic.applicationTree.refresh', async () => {
		applicationManager.refreshApplications();
	});
}

export function registerCommandRefreshFunctions(functionTree: SepticFunctionTreeProvider) {
	vscode.commands.registerCommand('septic.functionTree.refresh', async () => {
		functionTree.refresh();
	});
}

export function registerCommandStartApplication(applicationManager: SepticApplicationManager) {
	vscode.commands.registerCommand('septic.applicationTree.start', async (e: ApplicationTreeItem) => {
		const application = await applicationManager.getApplicationByName(e.label);
		if (!application) {
			return;
		}
		const runFolderPath = vscode.Uri.joinPath(vscode.Uri.file(application.path), "run");
		const makeAndStartPath = vscode.Uri.joinPath(runFolderPath, "makeandstart.bat");
		try {
			await vscode.workspace.fs.stat(makeAndStartPath);
		} catch {
			vscode.window.showErrorMessage(`No makeandstart.bat found in run catalog for ${application.name}`);
			return;
		}
		const existingTerminal = vscode.window.terminals.find(t => t.name === `Septic: ${application.name}`);
		const terminal = existingTerminal || vscode.window.createTerminal({
			name: `Septic: ${application.name}`,
			cwd: runFolderPath
		});
		terminal.show();
		terminal.sendText(`.\\makeandstart.bat`)
	});
}

export function registerCommandMakeConfig() {
	vscode.commands.registerCommand('septic.applicationTree.make', async (e: ApplicationTreeItem) => {
		vscode.window.terminals.find(t => t.name === `Septic: Make scg config`)?.dispose();
		const args = await vscode.window.showInputBox({
			prompt: "Enter run time arguments (leave empty for none)",
			placeHolder: "Arguments",
			value: "",
			validateInput: (input: string) => {
				const regex = /^$|^(--var\s+\w+\s+\S+\s*)*$/;
				if (!regex.test(input.trim())) {
					return "Input must follow the format: --var <name> <value>";
				}
				return null;
			}
		});
		const terminal = vscode.window.createTerminal({
			name: `Septic: Make scg config`,
			cwd: path.dirname(e.config.path)
		});
		terminal.show()
		terminal.sendText(`scg make ${e.label} ${args}`);
		vscode.window.showTextDocument(vscode.Uri.file(e.config.outputfile))
	});
}

export function registerCommandGenerateCalc(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.generateCalc", async (description: string, start: vscode.Position, end: vscode.Position) => {
		generateCalc(client, description, start, end);
	});
}

export function registerCommandPlotModel() {
	vscode.commands.registerCommand('septic.plotModel', async (e: vscode.Uri) => {
		const doc = await vscode.workspace.openTextDocument(e);
		const mdfContent = doc.getText();
		createMdfWebviewPanel(mdfContent, path.basename(e.path));
	})
}

export function registerCommandGetFunctions(context: vscode.ExtensionContext, client: LanguageClient) {
	vscode.commands.registerCommand("septic.getFunctions", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document.fileName.endsWith(".cnfg")) {
			vscode.window.showInformationMessage("No .cnfg file is currently open.");
			return;
		}
		const uri = editor.document.uri.toString();
		const functions = await client.sendRequest(protocol.getFunctions, { uri });
		if (!functions || !functions.length) {
			vscode.window.showInformationMessage("Functions found in this file.");
			return;
		}
		// Format output similar to printFunctionInfo
		const formatted = functions.map(func => {
			let out = `function ${func.name}(${func.inputs.join(", ")})\n`;
			func.lines.forEach((line, idx) => {
				if (idx === func.lines.length - 1) {
					out += line.doc
						? `   return ${line.alg} #${line.doc}\n`
						: `   return ${line.alg}\n`;
				} else {
					out += line.doc
						? `   ${line.name} = ${line.alg} #${line.doc}\n`
						: `   ${line.name} = ${line.alg}\n`;
				}
			});
			return out;
		}).join("\n");
		// Show in new untitled document
		const doc = await vscode.workspace.openTextDocument({ content: formatted, language: "plaintext" });
		vscode.window.showTextDocument(doc, { preview: false });
	});
}

export function registerCommands(context: vscode.ExtensionContext, client: LanguageClient, applicationTreeProvider: ApplicationTreeProvider, applicationManager: SepticApplicationManager, functionTree: SepticFunctionTreeProvider) {
	registerCommandDetectCycles(context, client);
	registerCommandCompareCnfg(context, client);
	registerCommandOpcTagList(context, client);
	registerCommandGenerateCalc(context, client);
	registerCommandAddTemplate(applicationTreeProvider);
	registerCommandRemoveTemplate(applicationTreeProvider);
	registerCommandRenameTemplate(applicationTreeProvider);
	registerCommandAddSource(applicationTreeProvider);
	registerCommandStartApplication(applicationManager);
	registerCommandRefreshApplications(applicationManager);
	registerCommandRefreshFunctions(functionTree);
	registerCommandMakeConfig();
	registerCommandPlotModel();
	registerCommandGetFunctions(context, client);
}


