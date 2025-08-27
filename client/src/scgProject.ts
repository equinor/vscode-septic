import * as vscode from 'vscode';
import { findScgConfigFiles, readScgConfig, ScgConfig } from './scg';
import * as path from 'path';

export class SCGProjectProvider implements vscode.TreeDataProvider<SCG> {

	private _onDidChangeTreeData: vscode.EventEmitter<SCG | undefined | void> = new vscode.EventEmitter<SCG | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<SCG | undefined | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SCG): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SCG): Promise<SCG[]> {
		if (!element) {
			return Promise.resolve(this.getSCGFiles());
		}
		if (element.type === SCGType.Config && element.config) {
			const layout = new SCG("Layout", SCGType.Layout, vscode.TreeItemCollapsibleState.Expanded, element.config, element.file);
			const sources = new SCG("Sources", SCGType.Sources, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file);
			return Promise.resolve([layout, sources]);
		} else if (element.type === SCGType.Layout) {
			const items: SCG[] = [];
			for (const layout of element.config.layout) {
				const fileDir = element.file ? path.dirname(element.file) : '';
				items.push(new SCG(layout.name, SCGType.Template, vscode.TreeItemCollapsibleState.None, undefined, undefined, {
					command: 'vscode.open',
					title: 'Open Template',
					arguments: [vscode.Uri.file(fileDir + "/" + element.config.templatepath + "/" + layout.name || '')]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === SCGType.Sources) {
			const items: SCG[] = [];
			for (const source of element.config.sources) {
				const fileDir = element.file ? path.dirname(element.file) : '';
				items.push(new SCG(source.id, SCGType.Source, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file, {
					command: 'vscode.open',
					title: 'Open Source',
					arguments: [vscode.Uri.file(fileDir + "/" + source.filename)]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === SCGType.Source) {
			const source = element.config.sources.find((s) => s.id === element.label);
			if (!source) {
				return Promise.resolve([]);
			}
			const filePath = path.dirname(element.file) + "/" + source.filename;
			const columns = await this.getScgSourceColumns(filePath, source.delimiter || ';');
			return Promise.resolve(columns.map(column => new SCG(column, SCGType.SourceColumn, vscode.TreeItemCollapsibleState.None, undefined, undefined,)));
		}
		else {
			return Promise.resolve([]);
		}

	}

	private async getSCGFiles(): Promise<SCG[]> {
		const files = await findScgConfigFiles();
		const treeItems: SCG[] = [];
		files.sort((a, b) => path.basename(a.fsPath).localeCompare(path.basename(b.fsPath)));
		for (const file of files) {
			const config = await readScgConfig(file.fsPath);
			if (!config) {
				continue;
			}
			const outputFileName = path.parse(config.outputfile).name;
			treeItems.push(new SCG(outputFileName, SCGType.Config, vscode.TreeItemCollapsibleState.Expanded, config, file.fsPath, {
				command: 'vscode.open',
				title: 'Open Config',
				arguments: [vscode.Uri.file(file.fsPath)]
			}));
		}
		return treeItems;
	}

	private async getScgSourceColumns(file: string, delimiter: string): Promise<string[]> {
		try {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
			const lines = content.toString().split('\n');
			const headers = lines[0].split(delimiter);
			return headers.map(header => header.trim());
		} catch (error) {
			console.error('Error reading source columns:', error);
			return [];
		}
	}
}

enum SCGType {
	Config = "Config",
	Template = "Template",
	Layout = "Layout",
	Sources = "Sources",
	Source = "Source",
	SourceColumn = "Column"
}

export class SCG extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly type: SCGType,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly config?: ScgConfig,
		public readonly file?: string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}`;
		this.description = this.type;
		this.contextValue = this.type;
		if (type === SCGType.Config && file) {
			this.iconPath = new vscode.ThemeIcon("settings-view-bar-icon");
		} else if (type === SCGType.Layout) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === SCGType.Template) {
			this.iconPath = new vscode.ThemeIcon("file");
		} else if (type === SCGType.Sources) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === SCGType.Source) {
			this.iconPath = new vscode.ThemeIcon("outline-view-icon");
		}
	}
}