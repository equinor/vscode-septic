/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TableOfContentsProvider } from './tableOfContentsProvider';

export default class SepticFoldingProvider implements vscode.FoldingRangeProvider {

	public async provideFoldingRanges(
		document: vscode.TextDocument,
		_: vscode.FoldingContext,
		_token: vscode.CancellationToken
	): Promise<vscode.FoldingRange[]> {
		return await this.getFoldingRanges(document);
	}

	private async getFoldingRanges(document: vscode.TextDocument) {
		const tocProvider = new TableOfContentsProvider(document);
		const toc = await tocProvider.getToc();
		return toc.map(entry => {
			let endLine = entry.location.range.end.line;
			return new vscode.FoldingRange(entry.line, endLine);
		});
	}
}
