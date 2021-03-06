/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import 'mocha';

import SepticFoldingProvider from '../../foldingProvider';
import { InMemoryDocument } from './inMemoryDocument';

const testFileName = vscode.Uri.file('test.cnfg');

suite('FoldingProvider', () => {
	test('Should not return anything for empty document', async () => {
		const folds = await getFoldsForDocument(``);
		assert.strictEqual(folds.length, 0);
	});

	test('Should not return anything for document without keywords', async () => {
		const folds = await getFoldsForDocument(`a
**b** afas
a#b
a`);
		assert.strictEqual(folds.length, 0);
	});

	test('Should fold from header to end of document', async () => {
		const folds = await getFoldsForDocument(`a
System: SYSNAME
c
d`);
		assert.strictEqual(folds.length, 1);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should leave single newline before next header', async () => {
		const folds = await getFoldsForDocument(`
System: SYSNAME
x

SopcProc: SOPCPROCNAME
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 3);
	});

	test('Should collapse multiple newlines to single newline before next header', async () => {
		const folds = await getFoldsForDocument(`
System: SYSNAME
x



SopcProc: SOPCPROCNAME
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 5);
	});

	test('Should not collapse if there is no newline before next header', async () => {
		const folds = await getFoldsForDocument(`
System: SYSNAME
x
SopcProc: SOPCPROCNAME
y`);
		assert.strictEqual(folds.length, 2);
		const firstFold = folds[0];
		assert.strictEqual(firstFold.start, 1);
		assert.strictEqual(firstFold.end, 2);
	});
});

async function getFoldsForDocument(contents: string) {
	const doc = new InMemoryDocument(testFileName, contents);
	const provider = new SepticFoldingProvider();
	return await provider.provideFoldingRanges(doc, {}, new vscode.CancellationTokenSource().token);
}