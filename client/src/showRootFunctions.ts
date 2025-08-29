import * as vscode from "vscode";
import * as protocol from "./protocol";
import { LanguageClient } from "vscode-languageclient/node";

export function registerCommandShowRootFunctions(context: vscode.ExtensionContext, client: LanguageClient) {
    vscode.commands.registerCommand("septic.showRootFunctions", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith(".cnfg")) {
            vscode.window.showInformationMessage("No .cnfg file is currently open.");
            return;
        }
        const uri = editor.document.uri.toString();
        const functions = await client.sendRequest(protocol.getRootFunctions, { uri });
        if (!functions || !functions.length) {
            vscode.window.showInformationMessage("No root functions found in this file.");
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
