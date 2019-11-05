/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TableOfContentsProvider, SkinnyTextDocument, TocEntry } from './tableOfContentsProvider';

interface SepticSymbol {
	readonly level: number;
	readonly parent: SepticSymbol | undefined;
	readonly children: vscode.DocumentSymbol[];
}

export default class SepticDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public async provideDocumentSymbolInformation(document: SkinnyTextDocument): Promise<vscode.SymbolInformation[]> {
		const toc = await new TableOfContentsProvider(document).getToc();
		return toc.map(entry => this.toSymbolInformation(entry));
	}

	public async provideDocumentSymbols(document: SkinnyTextDocument): Promise<vscode.DocumentSymbol[]> {
		const toc = await new TableOfContentsProvider(document).getToc();
		const root: SepticSymbol = {
			level: -Infinity,
			children: [],
			parent: undefined
		};
		this.buildTree(root, toc);
		return root.children;
	}

	private buildTree(parent: SepticSymbol, entries: TocEntry[]) {
		if (!entries.length) {
			return;
		}

		const entry = entries[0];
		const symbol = this.toDocumentSymbol(entry);
		symbol.children = [];

		while (parent && entry.level <= parent.level) {
			parent = parent.parent!;
		}
		parent.children.push(symbol);
		this.buildTree({ level: entry.level, children: symbol.children, parent }, entries.slice(1));
	}


	private toSymbolInformation(entry: TocEntry): vscode.SymbolInformation {
		return new vscode.SymbolInformation(
			this.getSymbolName(entry),
			entry.symbolKind,
			'',
			entry.location);
	}

	private toDocumentSymbol(entry: TocEntry) {
		return new vscode.DocumentSymbol(
			this.getSymbolName(entry),
			'',
			entry.symbolKind,
			entry.location.range,
			entry.location.range);
	}

	private getSymbolName(entry: TocEntry): string {
        let res = entry.text.match(/^\s*\b(\w*)\b:\s*([\w\ \{\}\*\-<>]*)/)
        if (res) {
            return res[1] + ': ' + res[2];
        }
        return "Unknown - this shouldn't happen"
	}
}