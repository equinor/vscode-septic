
import * as vscode from 'vscode';
import { TableOfContentsProvider } from './tableOfContentsProvider';

const rangeLimit = 5000;

function flatten<T>(arr: ReadonlyArray<T>[]): T[] {
	return ([] as T[]).concat.apply([], arr);
}

export default class SepticFoldingProvider implements vscode.FoldingRangeProvider {
	
	constructor( ) { }

	public async provideFoldingRanges(
		
		document: vscode.TextDocument,
		_: vscode.FoldingContext,
		_token: vscode.CancellationToken
	): Promise<vscode.FoldingRange[]> {
		const foldables = await Promise.all([
			this.getHeaderFoldingRanges(document),
		]);
		return flatten(foldables).slice(0, rangeLimit);
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
			console.log(foldingRange.start, foldingRange.end)
			return foldingRange;
		});
	}
}
