/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as vscode from 'vscode';

export function getSearchPattern(workspacePath: string, templatePath: string) {
    const baseWorkspace = path.basename(workspacePath);
    let parts: string[] = [];
    let temp = templatePath;
    while (path.basename(temp) !== baseWorkspace) {
        parts.push(path.basename(temp));
        temp = path.dirname(temp);
    }

    parts = parts.reverse();

    return "**/" + parts.join("/") + "/*.cnfg";
}

export async function dumpMessages(messages: vscode.LanguageModelChatMessage[], filename: string = 'chat-messages.log') {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }

    const wsPath = workspaceFolders[0].uri.fsPath;
    const filePath = vscode.Uri.file(`${wsPath}/${filename}`);

    // Format messages
    const formattedMessages = messages.map(msg => {
        return `[${msg.role}]\n${msg.content.map((part) => {
            const textPart = part as vscode.LanguageModelTextPart;
            return textPart.value;
        })}\n-----------------\n`;
    }).join('\n');

    // Create workspace edit
    const wsedit = new vscode.WorkspaceEdit();
    wsedit.createFile(filePath, {
        contents: Buffer.from(formattedMessages),
        overwrite: true
    });

    // Apply edit
    await vscode.workspace.applyEdit(wsedit);
}

