// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import SepticDocumentSymbolProvider from './documentSymbolProvider';
import SepticFoldingProvider from './foldingProvider';
import SepticWorkspaceSymbolProvider from './workspaceSymbolProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
	const symbolProvider = new SepticDocumentSymbolProvider();

	context.subscriptions.push(registerSepticLanguageFeatures(symbolProvider));
	//console.log('Congratulations, your extension is now active!');
}

function registerSepticLanguageFeatures(
	symbolProvider: SepticDocumentSymbolProvider
): vscode.Disposable {
	const selector: vscode.DocumentSelector = [
		{ language: 'septic', scheme: 'file' },
		{ language: 'septic', scheme: 'untitled' }
	];

	return vscode.Disposable.from(
		vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider),
		vscode.languages.registerFoldingRangeProvider(selector, new SepticFoldingProvider()),
		vscode.languages.registerWorkspaceSymbolProvider(new SepticWorkspaceSymbolProvider(symbolProvider))
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
