/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from './util/dispose';
import { Lazy, lazy } from './util/lazy';
import SepticDocumentSymbolProvider from './documentSymbolProvider';
import { SkinnyTextDocument, SkinnyTextLine } from './tableOfContentsProvider';
import { flatten } from './util/arrays';

export function isSepticFile(document: vscode.TextDocument) {
	return document.languageId === 'septic';
}

export interface WorkspaceSepticDocumentProvider {
	getAllSepticDocuments(): Thenable<Iterable<SkinnyTextDocument>>;

	readonly onDidChangeSepticDocument: vscode.Event<SkinnyTextDocument>;
	readonly onDidCreateSepticDocument: vscode.Event<SkinnyTextDocument>;
	readonly onDidDeleteSepticDocument: vscode.Event<vscode.Uri>;
}

class VSCodeWorkspaceSepticDocumentProvider extends Disposable implements WorkspaceSepticDocumentProvider {

	private readonly _onDidChangeSepticDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	private readonly _onDidCreateSepticDocumentEmitter = this._register(new vscode.EventEmitter<SkinnyTextDocument>());
	private readonly _onDidDeleteSepticDocumentEmitter = this._register(new vscode.EventEmitter<vscode.Uri>());

	private _watcher: vscode.FileSystemWatcher | undefined;

	async getAllSepticDocuments() {
		const resources = await vscode.workspace.findFiles('**/*.cnfg');
		const docs = await Promise.all(resources.map(doc => this.getSepticDocument(doc)));
		return docs.filter(doc => !!doc) as SkinnyTextDocument[];
	}

	public get onDidChangeSepticDocument() {
		this.ensureWatcher();
		return this._onDidChangeSepticDocumentEmitter.event;
	}

	public get onDidCreateSepticDocument() {
		this.ensureWatcher();
		return this._onDidCreateSepticDocumentEmitter.event;
	}

	public get onDidDeleteSepticDocument() {
		this.ensureWatcher();
		return this._onDidDeleteSepticDocumentEmitter.event;
	}

	private ensureWatcher(): void {
		if (this._watcher) {
			return;
		}

		this._watcher = this._register(vscode.workspace.createFileSystemWatcher('**/*.cnfg'));

		this._watcher.onDidChange(async resource => {
			const document = await this.getSepticDocument(resource);
			if (document) {
				this._onDidChangeSepticDocumentEmitter.fire(document);
			}
		}, null, this._disposables);

		this._watcher.onDidCreate(async resource => {
			const document = await this.getSepticDocument(resource);
			if (document) {
				this._onDidCreateSepticDocumentEmitter.fire(document);
			}
		}, null, this._disposables);

		this._watcher.onDidDelete(async resource => {
			this._onDidDeleteSepticDocumentEmitter.fire(resource);
		}, null, this._disposables);

		vscode.workspace.onDidChangeTextDocument(e => {
			if (isSepticFile(e.document)) {
				this._onDidChangeSepticDocumentEmitter.fire(e.document);
			}
		}, null, this._disposables);
	}

	private async getSepticDocument(resource: vscode.Uri): Promise<SkinnyTextDocument | undefined> {
		const matchingDocuments = vscode.workspace.textDocuments.filter((doc) => doc.uri.toString() === resource.toString());
		if (matchingDocuments.length !== 0) {
			return matchingDocuments[0];
		}

		const bytes = await vscode.workspace.fs.readFile(resource);

		const text = Buffer.from(bytes).toString('ascii');

		const lines: SkinnyTextLine[] = [];
		const parts = text.split(/(\r?\n)/);
		const lineCount = Math.floor(parts.length / 2) + 1;
		for (let line = 0; line < lineCount; line++) {
			lines.push({
				text: parts[line * 2]
			});
		}
		return {
			uri: resource,
			version: 0,
			lineCount: lineCount,
			lineAt: (index) => {
				return lines[index];
			},
			getText: () => {
				return text;
			}
		};
	}
}

export default class SepticWorkspaceSymbolProvider extends Disposable implements vscode.WorkspaceSymbolProvider {
	private _symbolCache = new Map<string, Lazy<Thenable<vscode.SymbolInformation[]>>>();
	private _symbolCachePopulated: boolean = false;

	public constructor(
		private _symbolProvider: SepticDocumentSymbolProvider,
		private _workspaceSepticDocumentProvider: WorkspaceSepticDocumentProvider = new VSCodeWorkspaceSepticDocumentProvider()
	) {
		super();
	}

	public async provideWorkspaceSymbols(query: string): Promise<vscode.SymbolInformation[]> {
		if (!this._symbolCachePopulated) {
			await this.populateSymbolCache();
			this._symbolCachePopulated = true;

			this._workspaceSepticDocumentProvider.onDidChangeSepticDocument(this.onDidChangeDocument, this, this._disposables);
			this._workspaceSepticDocumentProvider.onDidCreateSepticDocument(this.onDidChangeDocument, this, this._disposables);
			this._workspaceSepticDocumentProvider.onDidDeleteSepticDocument(this.onDidDeleteDocument, this, this._disposables);
		}

		const allSymbolsSets = await Promise.all(Array.from(this._symbolCache.values()).map(x => x.value));
		const allSymbols = flatten(allSymbolsSets);
		return allSymbols.filter(symbolInformation => symbolInformation.name.toLowerCase().indexOf(query.toLowerCase()) !== -1);
	}

	public async populateSymbolCache(): Promise<void> {
		const septicDocumentUris = await this._workspaceSepticDocumentProvider.getAllSepticDocuments();
		for (const document of septicDocumentUris) {
			this._symbolCache.set(document.uri.fsPath, this.getSymbols(document));
		}
	}

	private getSymbols(document: SkinnyTextDocument): Lazy<Thenable<vscode.SymbolInformation[]>> {
		return lazy(async () => {
			return this._symbolProvider.provideDocumentSymbolInformation(document);
		});
	}

	private onDidChangeDocument(document: SkinnyTextDocument) {
		this._symbolCache.set(document.uri.fsPath, this.getSymbols(document));
	}

	private onDidDeleteDocument(resource: vscode.Uri) {
		this._symbolCache.delete(resource.fsPath);
	}
}
