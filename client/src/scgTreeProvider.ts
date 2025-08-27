import * as vscode from 'vscode';
import { ScgConfig } from './scg';
import { SepticApplicationManager } from './applicationManager';

export class ScgTreeProvider implements vscode.TreeDataProvider<ScgNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<ScgNode | undefined | void> = new vscode.EventEmitter<ScgNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ScgNode | undefined | void> = this._onDidChangeTreeData.event;
	private appManager: SepticApplicationManager;

	constructor(appManager: SepticApplicationManager) {
		this.appManager = appManager;
	}
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ScgNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ScgNode): Promise<ScgNode[]> {
		if (!element) {
			return Promise.resolve(this.getScgConfigs());
		}
		if (element.type === ScgTreeItemType.Config && element.config) {
			const layout = new ScgNode("Layout", ScgTreeItemType.Layout, vscode.TreeItemCollapsibleState.Expanded, element.config, element.file);
			const sources = new ScgNode("Sources", ScgTreeItemType.Sources, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file);
			return Promise.resolve([layout, sources]);
		} else if (element.type === ScgTreeItemType.Layout) {
			const items: ScgNode[] = [];
			for (const layout of element.config.layout) {
				items.push(new ScgNode(layout.name, ScgTreeItemType.Template, vscode.TreeItemCollapsibleState.None, undefined, undefined, {
					command: 'vscode.open',
					title: 'Open Template',
					arguments: [vscode.Uri.file(element.config.templatepath + "/" + layout.name || '')]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === ScgTreeItemType.Sources) {
			const items: ScgNode[] = [];
			const sources = await element.config.getSources();
			for (const source of sources) {
				items.push(new ScgNode(source.id, ScgTreeItemType.Source, vscode.TreeItemCollapsibleState.Collapsed, element.config, element.file, {
					command: 'vscode.open',
					title: 'Open Source',
					arguments: [vscode.Uri.file(source.filename)]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === ScgTreeItemType.Source) {
			const source = await element.config.getSourceById(element.label);
			if (!source) {
				return Promise.resolve([]);
			}
			const columns = await source.getHeaders();
			if (!columns) {
				return Promise.resolve([]);
			}
			return Promise.resolve(columns.map(column => new ScgNode(column, ScgTreeItemType.SourceColumn, vscode.TreeItemCollapsibleState.None, undefined, undefined,)));
		}
		else {
			return Promise.resolve([]);
		}

	}

	private async getScgConfigs(): Promise<ScgNode[]> {
		const application = await this.appManager.getCurrentApplication();
		const scgConfigs = application.scgConfigs;
		const treeItems: ScgNode[] = [];
		scgConfigs.sort((a, b) => a.name.localeCompare(b.name));
		for (const config of scgConfigs) {
			treeItems.push(new ScgNode(config.name, ScgTreeItemType.Config, vscode.TreeItemCollapsibleState.Expanded, config, config.path, {
				command: 'vscode.open',
				title: 'Open Config',
				arguments: [vscode.Uri.file(config.path)]
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

enum ScgTreeItemType {
	Config = "Config",
	Template = "Template",
	Layout = "Layout",
	Sources = "Sources",
	Source = "Source",
	SourceColumn = "Column"
}

export class ScgNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly type: ScgTreeItemType,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly config?: ScgConfig,
		public readonly file?: string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}`;
		this.description = this.type;
		this.contextValue = this.type;
		if (type === ScgTreeItemType.Config && file) {
			this.iconPath = new vscode.ThemeIcon("settings-view-bar-icon");
		} else if (type === ScgTreeItemType.Layout) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === ScgTreeItemType.Template) {
			this.iconPath = new vscode.ThemeIcon("file");
		} else if (type === ScgTreeItemType.Sources) {
			this.iconPath = new vscode.ThemeIcon("folder");
		} else if (type === ScgTreeItemType.Source) {
			this.iconPath = new vscode.ThemeIcon("outline-view-icon");
		}
	}
}