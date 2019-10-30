
import * as vscode from 'vscode';
import { TableOfContentsProvider } from './tableOfContentsProvider';

const rangeLimit = 5000;
export default class SepticFoldingProvider implements vscode.FoldingRangeProvider {

	public async provideFoldingRanges(
		document: vscode.TextDocument,
		_: vscode.FoldingContext,
		_token: vscode.CancellationToken
	): Promise<vscode.FoldingRange[]> {
		return await this.getHeaderFoldingRanges(document);
	}

	private async getHeaderFoldingRanges(document: vscode.TextDocument) {
		const tocProvider = new TableOfContentsProvider(document);
		const toc = await tocProvider.getToc();
		return toc.map(entry => {
			let endLine = entry.end;
			if (document.lineAt(endLine).isEmptyOrWhitespace && endLine >= entry.end + 1) {
				endLine = endLine - 1;
			}
			const foldingRange = new vscode.FoldingRange(entry.start, endLine)
			//console.log(foldingRange.start, foldingRange.end)
			return foldingRange;
		});
	}
}
