/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

export let activated = false;

export async function activate() {
    if (activated) {
        return;
    }
    try {
        const ext = vscode.extensions.getExtension("EinarSIdso.septic-config");
        await ext.activate();
        await sleep(10000);
        activated = true;
    } catch (e) {
        console.error(e);
    }
}

export async function openDocument(docUri: vscode.Uri) {
    try {
        doc = await vscode.workspace.openTextDocument(docUri);
        editor = await vscode.window.showTextDocument(doc);
    } catch (e) {
        console.error(e);
    }
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
    return path.resolve(__dirname, "../../../test-workspace", p);
};
export const getDocUri = (p: string) => {
    return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
    const all = new vscode.Range(
        doc.positionAt(0),
        doc.positionAt(doc.getText().length),
    );
    return editor.edit((eb) => eb.replace(all, content));
}
