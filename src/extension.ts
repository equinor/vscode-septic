// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import SepticFoldingProvider from './foldingProvider';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(registerSepticLanguageFeatures());
	//console.log('Congratulations, your extension is now active!');
}

function registerSepticLanguageFeatures(
): vscode.Disposable {
	const selector: vscode.DocumentSelector = [
		{ language: 'septic', scheme: 'file' },
		{ language: 'septic', scheme: 'untitled' }
	];

	return vscode.Disposable.from(
		vscode.languages.registerFoldingRangeProvider(selector, new SepticFoldingProvider()),
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
