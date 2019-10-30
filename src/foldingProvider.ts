
import * as vscode from 'vscode';

const rangeLimit = 5000;

function flatten<T>(arr: ReadonlyArray<T>[]): T[] {
	return ([] as T[]).concat.apply([], arr);
}

export default class SepticFoldingProvider implements vscode.FoldingRangeProvider {
    
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
		//const tocProvider = new TableOfContentsProvider(document);
		//const toc = await tocProvider.getToc();
		const toc = []

		toc.push({
			start: 0,
			end: 9
		});
		toc.push({
			start: 4,
			end: 5
		});
		toc.push({
			start: 7,
			end: 8
		});
		toc.push({
			start: 10,
			end: 14
		});
		toc.push({
			start: 13,
			end: 14
		});

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
