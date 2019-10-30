import * as vscode from 'vscode';

export interface TocEntry {
	readonly level: number;
    readonly start: number;
    readonly end: number;
}

export interface SkinnyTextLine {
	text: string;
}

export interface SkinnyTextDocument {
	readonly uri: vscode.Uri;
	readonly version: number;
	readonly lineCount: number;

	lineAt(line: number): SkinnyTextLine;
	getText(): string;
}

export class TableOfContentsProvider {
	private toc?: TocEntry[];

	public constructor(
		private document: SkinnyTextDocument
	) { }

	public async getToc(): Promise<TocEntry[]> {
		if (!this.toc) {
			try {
				this.toc = await this.buildToc(this.document);
			} catch (e) {
				this.toc = [];
			}
		}
		return this.toc;
	}

    private async buildToc(document: SkinnyTextDocument): Promise<TocEntry[]> {
        const toc: TocEntry[] = [];

		toc.push({
			start: 0,
            end: 0,
            level: 1
		});
		toc.push({
			start: 4,
            end: 0,
            level: 2
		});
		toc.push({
			start: 7,
            end: 0,
            level: 2
		});
		toc.push({
			start: 10,
            end: 0,
            level: 1
		});
		toc.push({
			start: 13,
            end: 0,
            level: 2
		});
        return toc.map((entry, startIndex): TocEntry => {
			let end: number | undefined = undefined;
			for (let i = startIndex + 1; i < toc.length; ++i) {
				if (toc[i].level <= entry.level) {
					end = toc[i].start - 1;
					break;
				}
			}
			const endLine = end !== undefined ? end : document.lineCount - 1;
			return {
				...entry,
				end: endLine
			};
		});
	}
}