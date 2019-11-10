/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import SymbolProvider from '../../documentSymbolProvider';
import { InMemoryDocument } from './inMemoryDocument';


const testFileName = vscode.Uri.file('test.cnfg');


function getSymbolsForFile(fileContents: string) {
	const doc = new InMemoryDocument(testFileName, fileContents);
	const provider = new SymbolProvider();
	return provider.provideDocumentSymbols(doc);
}


suite('DocumentSymbolProvider', () => {
	test('Should not return anything for empty document', async () => {
		const symbols = await getSymbolsForFile('');
		assert.strictEqual(symbols.length, 0);
	});

	test('Should not return anything for document with no headers', async () => {
		const symbols = await getSymbolsForFile('a\na');
		assert.strictEqual(symbols.length, 0);
	});

	test('Should return single symbol for single header', async () => {
		const symbols = await getSymbolsForFile('SopcProc:    SOPC');
		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'SopcProc: SOPC');
	});

	test('Should not care about symbol level for single header', async () => {
		const symbols = await getSymbolsForFile('Evr:        EVR');
		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'Evr: EVR');
	});

	test('Should put symbols of same level in flat list', async () => {
		const symbols = await getSymbolsForFile('System:    SYSNAME\nSopcProc:    SOPCPRC');
		assert.strictEqual(symbols.length, 2);
		assert.strictEqual(symbols[0].name, 'System: SYSNAME');
		assert.strictEqual(symbols[1].name, 'SopcProc: SOPCPRC');
	});

	test('Should nest symbol of level - 1 under parent', async () => {

		const symbols = await getSymbolsForFile('SopcProc:   SOPCPRC\nEVR:    Evr1\nEVR:    Evr2');
		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'SopcProc: SOPCPRC');
		assert.strictEqual(symbols[0].children.length, 2);
		assert.strictEqual(symbols[0].children[0].name, 'EVR: Evr1');
		assert.strictEqual(symbols[0].children[1].name, 'EVR: Evr2');
	});

	test('Should nest symbol of level - n under parent', async () => {
		const symbols = await getSymbolsForFile('DmmyAppl:    DMYAPL\nCalcPvr:     PVR');
		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'DmmyAppl: DMYAPL');
		assert.strictEqual(symbols[0].children.length, 1);
		assert.strictEqual(symbols[0].children[0].name, 'CalcPvr: PVR');
	});

	test('Should flatten children where lower level occurs first', async () => {
		const symbols = await getSymbolsForFile('DmmyAppl:   DMYAPL\nCalcPvr:    PVR\nCalcModl:    MODL');
		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'DmmyAppl: DMYAPL');
		assert.strictEqual(symbols[0].children.length, 2);
		assert.strictEqual(symbols[0].children[0].name, 'CalcPvr: PVR');
		assert.strictEqual(symbols[0].children[1].name, 'CalcModl: MODL');
	});
});