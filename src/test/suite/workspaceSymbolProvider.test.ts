/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import SepticDocumentSymbolProvider from '../../documentSymbolProvider';
import SepticWorkspaceSymbolProvider, { WorkspaceSepticDocumentProvider } from '../../workspaceSymbolProvider';
import { InMemoryDocument } from './inMemoryDocument';


const symbolProvider = new SepticDocumentSymbolProvider();

suite('WorkspaceSymbolProvider', () => {
	test('Should not return anything for empty workspace', async () => {
		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, new InMemoryWorkspaceSepticDocumentProvider([]));

		assert.deepEqual(await provider.provideWorkspaceSymbols(''), []);
	});

	test('Should return symbols from workspace with one septic file', async () => {
		const testFileName = vscode.Uri.file('test.cnfg');

		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, new InMemoryWorkspaceSepticDocumentProvider([
			new InMemoryDocument(testFileName, `DmmyAppl:    DMYAPL\nabc\nEvr:    EVR`)
		]));

		const symbols = await provider.provideWorkspaceSymbols('');
		assert.strictEqual(symbols.length, 2);
		assert.strictEqual(symbols[0].name, 'DmmyAppl: DMYAPL');
		assert.strictEqual(symbols[1].name, 'Evr: EVR');
	});

	test('Should return all content basic workspace', async () => {
		const fileNameCount = 10;
		const files: vscode.TextDocument[] = [];
		for (let i = 0; i < fileNameCount; ++i) {
			const testFileName = vscode.Uri.file(`test${i}.cnfg`);
			files.push(new InMemoryDocument(testFileName, `DmmyAppl:    COMMON\nabc\nEvr:    EVR${i}`));
		}

		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, new InMemoryWorkspaceSepticDocumentProvider(files));

		const symbols = await provider.provideWorkspaceSymbols('');
		assert.strictEqual(symbols.length, fileNameCount * 2);
	});

	test('Should update results when markdown file changes symbols', async () => {
		const testFileName = vscode.Uri.file('test.cnfg');

		const workspaceFileProvider = new InMemoryWorkspaceSepticDocumentProvider([
			new InMemoryDocument(testFileName, `DmmyAppl:     DMYAPL1`, 1 /* version */)
		]);

		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, workspaceFileProvider);

		assert.strictEqual((await provider.provideWorkspaceSymbols('')).length, 1);

		// Update file
		workspaceFileProvider.updateDocument(new InMemoryDocument(testFileName, `DmmyAppl:    DMYAPL2\nabc\nEvr:    EVR`, 2 /* version */));
		const newSymbols = await provider.provideWorkspaceSymbols('');
		assert.strictEqual(newSymbols.length, 2);
		assert.strictEqual(newSymbols[0].name, 'DmmyAppl: DMYAPL2');
		assert.strictEqual(newSymbols[1].name, 'Evr: EVR');
	});

	test('Should remove results when file is deleted', async () => {
		const testFileName = vscode.Uri.file('test.cnfg');

		const workspaceFileProvider = new InMemoryWorkspaceSepticDocumentProvider([
			new InMemoryDocument(testFileName, `System:    SYSNAME`)
		]);

		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, workspaceFileProvider);
		assert.strictEqual((await provider.provideWorkspaceSymbols('')).length, 1);

		// delete file
		workspaceFileProvider.deleteDocument(testFileName);
		const newSymbols = await provider.provideWorkspaceSymbols('');
		assert.strictEqual(newSymbols.length, 0);
	});

	test('Should update results when markdown file is created', async () => {
		const testFileName = vscode.Uri.file('test.cnfg');

		const workspaceFileProvider = new InMemoryWorkspaceSepticDocumentProvider([
			new InMemoryDocument(testFileName, `System:     SYSNAME`)
		]);

		const provider = new SepticWorkspaceSymbolProvider(symbolProvider, workspaceFileProvider);
		assert.strictEqual((await provider.provideWorkspaceSymbols('')).length, 1);

		// Creat file
		workspaceFileProvider.createDocument(new InMemoryDocument(vscode.Uri.file('test2.cnfg'), `DmmyAppl:    DMYAPL\nabc\nEvr:    EVR`));
		const newSymbols = await provider.provideWorkspaceSymbols('');
		assert.strictEqual(newSymbols.length, 3);
	});
});


class InMemoryWorkspaceSepticDocumentProvider implements WorkspaceSepticDocumentProvider {
	private readonly _documents = new Map<string, vscode.TextDocument>();

	constructor(documents: vscode.TextDocument[]) {
		for (const doc of documents) {
			this._documents.set(doc.fileName, doc);
		}
	}

	async getAllSepticDocuments() {
		return Array.from(this._documents.values());
	}

	private readonly _onDidChangeSepticDocumentEmitter = new vscode.EventEmitter<vscode.TextDocument>();
	public onDidChangeSepticDocument = this._onDidChangeSepticDocumentEmitter.event;

	private readonly _onDidCreateSepticDocumentEmitter = new vscode.EventEmitter<vscode.TextDocument>();
	public onDidCreateSepticDocument = this._onDidCreateSepticDocumentEmitter.event;

	private readonly _onDidDeleteSepticDocumentEmitter = new vscode.EventEmitter<vscode.Uri>();
	public onDidDeleteSepticDocument = this._onDidDeleteSepticDocumentEmitter.event;

	public updateDocument(document: vscode.TextDocument) {
		this._documents.set(document.fileName, document);
		this._onDidChangeSepticDocumentEmitter.fire(document);
	}

	public createDocument(document: vscode.TextDocument) {
		assert.ok(!this._documents.has(document.uri.fsPath));

		this._documents.set(document.uri.fsPath, document);
		this._onDidCreateSepticDocumentEmitter.fire(document);
	}

	public deleteDocument(resource: vscode.Uri) {
		this._documents.delete(resource.fsPath);
		this._onDidDeleteSepticDocumentEmitter.fire(resource);
	}
}