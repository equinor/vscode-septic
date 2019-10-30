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
	readonly level: number;
    readonly start: number;
    readonly end: number;
}

export interface Keyword {
	line: number,
	keyword: string,
	value: string,
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
			let level = 99;
			for (let lvl in all_keywords) {
				if (all_keywords[lvl].includes(keyword.keyword.toLowerCase())){
					level = Number(lvl) + 1;
				}
			}
			toc.push({
				start: keyword.line,
				end: 0,
				level: level
			})
		}
		
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

	public async getKeywords(document: SkinnyTextDocument): Promise<Keyword[]> {
		const keywords: Keyword[] = [];
		let i = 0
		document.getText().split(/\r?\n/).forEach(line => {
			let res = line.match(/^\s*\b(\w*)\b:\s*([\{\}\ \w\*]*)/)
			if (res) {
				keywords.push({
					line: i,
					keyword: res[1],
					value: res[2],
				})
			}
			i++;
		});
		return keywords;
	}
}