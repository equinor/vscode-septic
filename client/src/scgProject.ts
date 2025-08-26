import * as vscode from 'vscode';
import { findScgConfigFiles, readScgConfig, ScgConfig } from './scg';
import * as path from 'path';

export class SCGProjectProvider implements vscode.TreeDataProvider<SCG> {

	private _onDidChangeTreeData: vscode.EventEmitter<SCG | undefined | void> = new vscode.EventEmitter<SCG | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<SCG | undefined | void> = this._onDidChangeTreeData.event;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly workspaceRoot: string | undefined
	) { }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SCG): vscode.TreeItem {
		return element;
	}

	getChildren(element?: SCG): Promise<SCG[]> {
		if (!element) {
			return Promise.resolve(this.getSCGFiles());
		}
		if (element.type === SCGType.Config && element.config) {
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
		} else {
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
}

enum SCGType {
	Config = "Config",
	Template = "Template"
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
		} else {
			this.iconPath = new vscode.ThemeIcon("file");
		}
	}
}