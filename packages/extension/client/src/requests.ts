/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as protocol from "./protocol";
import { getSearchPattern } from "./util";
import { LanguageClient } from "vscode-languageclient/node";

export function registerRequestHandlers(client: LanguageClient) {
	client.onRequest(protocol.globFiles, async (params) => {
		const parsedUri = vscode.Uri.parse(params.uri);
		const folder = vscode.workspace.getWorkspaceFolder(parsedUri);
		if (!folder) {
			return [];
		}
		const pattern = getSearchPattern(folder.uri.path, parsedUri.path);
		const files = await vscode.workspace.findFiles(pattern);
		return files
			.filter((f) => f.fsPath.includes(folder.uri.fsPath))
			.map((f) => f.toString());
	});

	client.onRequest(
		protocol.fsReadFile,
		async (e): Promise<number[]> => {
			const uri = vscode.Uri.parse(e.uri);
			return Array.from(await vscode.workspace.fs.readFile(uri));
		}
	);

	client.onRequest(protocol.findYamlFiles, async () => {
		return (await vscode.workspace.findFiles(`**/*.yaml`)).map((f) =>
			f.toString()
		);
	});
}