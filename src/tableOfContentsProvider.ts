import * as vscode from 'vscode';

export interface IHash {
	[id: number]: string[];
}

const all_keywords : IHash = {
	1: ['system', 'sopcproc', 'dmmyappl', 'smpcappl', 'displaygroup'
	],
	2: ['sopcmvr', 'sopccvr', 'sopctvr', 'sopcevr',
		'mvr', 'cvr', 'tvr', 'evr', 'dvr', 
		'calcmodl', 'exprmodl', 
		'table', 'appl', 'spacer', 'heading', 'mvrlist', 'cvrlist', 'dvrlist',
		'xvrplot', 'image', 'calctable', 'modelmatrix'
	],
	3: ['calcpvr', 'imagestatuslabel'
    ]
}

export interface TocEntry {
	readonly text: string;
	readonly level: number;
    readonly line: number;
    readonly location: vscode.Location;
}

export interface Keyword {
	line: number;
	keyword: string;
	value: string;
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
		const keywords = await this.getKeywords(document)
		// Rather messy but works
		for (let keyword of keywords) {
			const lineNumber = keyword.line
			const line = document.lineAt(lineNumber);

			let level = 99;
			for (let lvl in all_keywords) {
				if (all_keywords[lvl].includes(keyword.keyword.toLowerCase())){
					level = Number(lvl) + 1;
				}
			}
			toc.push({
				text: line.text,
				level: level,
				line: lineNumber,
				location: new vscode.Location(document.uri,
					new vscode.Range(lineNumber, 0, lineNumber, line.text.length))
			})
		}
		
        return toc.map((entry, startIndex): TocEntry => {
			let end: number | undefined = undefined;
			for (let i = startIndex + 1; i < toc.length; ++i) {
				if (toc[i].level <= entry.level) {
					end = toc[i].line - 1;
					break;
				}
			}
			const endLine = end !== undefined ? end : document.lineCount - 1;
			return {
				...entry,
				location: new vscode.Location(document.uri,
					new vscode.Range(
						entry.location.range.start,
						new vscode.Position(endLine, document.lineAt(endLine).text.length)))
			};
		});
	}

	public async getKeywords(document: SkinnyTextDocument): Promise<Keyword[]> {
		const keywords: Keyword[] = [];
		for (let i = 0; i < document.lineCount; i++){
			let line = document.lineAt(i);
			let res = line.text.match(/^\s*\b(\w*)\b:\s*([\w\ \{\}\*\-<>]*)/)
			if (res) {
				keywords.push({
					line: i,
					keyword: res[1],
					value: res[2]
				})
			}
		}
		return keywords;
	}
}