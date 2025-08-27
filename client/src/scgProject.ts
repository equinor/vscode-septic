import * as vscode from 'vscode';
import { findScgConfigFiles, readScgConfig, ScgConfig } from './scg';
import * as path from 'path';

export class SCGProjectProvider implements vscode.TreeDataProvider<SCGNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<SCGNode | undefined | void> = new vscode.EventEmitter<SCGNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<SCGNode | undefined | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SCGNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SCGNode): Promise<SCGNode[]> {
		if (!element) {
			return Promise.resolve(this.getSCGFiles());
		}
		if (element.type === SCGTreeItemType.Config && element.config) {
			const layout = new SCGNode("Layout", SCGTreeItemType.Layout, vscode.TreeItemCollapsibleState.Expanded, element.config, element.file);
			const sources = new SCGNode("Sources", SCGTreeItemType.Sources, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file);
			return Promise.resolve([layout, sources]);
		} else if (element.type === SCGTreeItemType.Layout) {
			const items: SCGNode[] = [];
			for (const layout of element.config.layout) {
				const fileDir = element.file ? path.dirname(element.file) : '';
				items.push(new SCGNode(layout.name, SCGTreeItemType.Template, vscode.TreeItemCollapsibleState.None, undefined, undefined, {
					command: 'vscode.open',
					title: 'Open Template',
					arguments: [vscode.Uri.file(fileDir + "/" + element.config.templatepath + "/" + layout.name || '')]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === SCGTreeItemType.Sources) {
			const items: SCGNode[] = [];
			for (const source of element.config.sources) {
				const fileDir = element.file ? path.dirname(element.file) : '';
				items.push(new SCGNode(source.id, SCGTreeItemType.Source, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file, {
					command: 'vscode.open',
					title: 'Open Source',
					arguments: [vscode.Uri.file(fileDir + "/" + source.filename)]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === SCGTreeItemType.Source) {
			const source = element.config.sources.find((s) => s.id === element.label);
			if (!source) {
				return Promise.resolve([]);
			}
			const filePath = path.dirname(element.file) + "/" + source.filename;
			const columns = await this.getScgSourceColumns(filePath, source.delimiter || ';');
			return Promise.resolve(columns.map(column => new SCGNode(column, SCGTreeItemType.SourceColumn, vscode.TreeItemCollapsibleState.None, undefined, undefined,)));
		}
		else {
			return Promise.resolve([]);
		}

	}

	private async getSCGFiles(): Promise<SCGNode[]> {
		const files = await findScgConfigFiles();
		const treeItems: SCGNode[] = [];
		files.sort((a, b) => path.basename(a.fsPath).localeCompare(path.basename(b.fsPath)));
		for (const file of files) {
			const config = await readScgConfig(file.fsPath);
			if (!config) {
				continue;
			}
			const outputFileName = path.parse(config.outputfile).name;
			treeItems.push(new SCGNode(outputFileName, SCGTreeItemType.Config, vscode.TreeItemCollapsibleState.Expanded, config, file.fsPath, {
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

enum SCGTreeItemType {
	Config = "Config",
	Template = "Template",
	Layout = "Layout",
	Sources = "Sources",
	Source = "Source",
	SourceColumn = "Column"
}

export class SCGNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly type: SCGTreeItemType,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly config?: ScgConfig,
		public readonly file?: string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}`;
		this.description = this.type;
		this.contextValue = this.type;
		if (type === SCGTreeItemType.Config && file) {
			this.iconPath = new vscode.ThemeIcon("settings-view-bar-icon");
		} else if (type === SCGTreeItemType.Layout) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === SCGTreeItemType.Template) {
			this.iconPath = new vscode.ThemeIcon("file");
		} else if (type === SCGTreeItemType.Sources) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === SCGTreeItemType.Source) {
			this.iconPath = new vscode.ThemeIcon("outline-view-icon");
		}
	}
}