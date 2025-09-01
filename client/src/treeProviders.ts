import * as vscode from 'vscode';
import { ScgConfig, ScgSource } from './scg';
import { SepticApplication, SepticApplicationManager } from './applicationManager';
import * as path from 'path';
import { LanguageClient } from 'vscode-languageclient/node';
import { SepticFunction } from './protocol';

export class ApplicationTreeProvider implements vscode.TreeDataProvider<ApplicationTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<ApplicationTreeItem | undefined | void> = new vscode.EventEmitter<ApplicationTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ApplicationTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	private appManager: SepticApplicationManager;

	constructor(appManager: SepticApplicationManager) {
		this.appManager = appManager;
		this.appManager.onDidChangeApplication(() => {
			this.refresh();
		})
	}
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ApplicationTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ApplicationTreeItem): Promise<ApplicationTreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getApplications());
		}
		if (element.type === ApplicationTreeItemType.Application) {
			const application = await this.appManager.getApplicationByName(element.label);
			if (!application) {
				return Promise.resolve([]);
			}
			return Promise.resolve(this.getApplicationConfigTreeItems(application));
		} else if (element.type === ApplicationTreeItemType.Config && element.config) {
			const layout = new ApplicationTreeItem("Layout", ApplicationTreeItemType.Layout, vscode.TreeItemCollapsibleState.Expanded, element.config);
			const sources = new ApplicationTreeItem("Sources", ApplicationTreeItemType.Sources, vscode.TreeItemCollapsibleState.Collapsed, element.config);
			return Promise.resolve([layout, sources]);
		} else if (element.type === ApplicationTreeItemType.Layout) {
			const items: ApplicationTreeItem[] = [];
			for (const layout of element.config.layout) {
				items.push(new ApplicationTreeItem(layout.name, ApplicationTreeItemType.Template, vscode.TreeItemCollapsibleState.None, element.config, {
					command: 'vscode.open',
					title: 'Open Template',
					arguments: [vscode.Uri.file(element.config.templatepath + "/" + layout.name || '')]
				}, layout.source));
			}
			return Promise.resolve(items);
		} else if (element.type === ApplicationTreeItemType.Sources) {
			const items: ApplicationTreeItem[] = [];
			const sources = await element.config.getSources();
			for (const source of sources) {
				items.push(new ApplicationTreeItem(source.id, ApplicationTreeItemType.Source, vscode.TreeItemCollapsibleState.Collapsed, element.config, {
					command: 'vscode.open',
					title: 'Open Source',
					arguments: [vscode.Uri.file(source.filename)]
				}));
			}
			return Promise.resolve(items);
		} else if (element.type === ApplicationTreeItemType.Source) {
			const source = await element.config.getSourceById(element.label);
			if (!source) {
				return Promise.resolve([]);
			}
			const columns = await source.getHeaders();
			if (!columns) {
				return Promise.resolve([]);
			}
			return Promise.resolve(columns.map(column => new ApplicationTreeItem(column, ApplicationTreeItemType.SourceColumn, vscode.TreeItemCollapsibleState.None, undefined, undefined,)));
		}
		else {
			return Promise.resolve([]);
		}

	}

	private async getApplications(): Promise<ApplicationTreeItem[]> {
		const applications = await this.appManager.getApplications();
		const currentApplication = await this.appManager.getCurrentApplication();
		const applicationTreeItems = [];
		for (const app of applications) {
			const itemState = app === currentApplication ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
			applicationTreeItems.push(new ApplicationTreeItem(app.name, ApplicationTreeItemType.Application, itemState, undefined));
		}
		return applicationTreeItems;
	}

	private async getApplicationConfigTreeItems(application: SepticApplication): Promise<ApplicationTreeItem[]> {
		const scgConfigs = application.scgConfigs;
		const treeItems: ApplicationTreeItem[] = [];
		scgConfigs.sort((a, b) => a.name.localeCompare(b.name));
		for (const config of scgConfigs) {
			treeItems.push(new ApplicationTreeItem(config.name, ApplicationTreeItemType.Config, vscode.TreeItemCollapsibleState.Expanded, config, {
				command: 'vscode.open',
				title: 'Open Config',
				arguments: [vscode.Uri.file(config.path)]
			}));
		}
		return treeItems;
	}
}

export enum ApplicationTreeItemType {
	Application = "Application",
	Config = "Config",
	Template = "Template",
	Layout = "Layout",
	Sources = "Sources",
	Source = "Source",
	SourceColumn = "Column"
}

export class ApplicationTreeItem extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly type: ApplicationTreeItemType,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly config: ScgConfig,
		public readonly command?: vscode.Command,
		public readonly source?: string
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}`;
		this.contextValue = this.type;
		if (type === ApplicationTreeItemType.Config) {
			this.iconPath = new vscode.ThemeIcon("settings-view-bar-icon");
			this.description = this.type;
		} else if (type === ApplicationTreeItemType.Application) {
			this.iconPath = new vscode.ThemeIcon("application");
			this.description = this.type;
		} else if (type === ApplicationTreeItemType.Layout) {
			this.iconPath = new vscode.ThemeIcon("folder");
			this.description = "";
		} else if (type === ApplicationTreeItemType.Template) {
			this.iconPath = new vscode.ThemeIcon("file");
			this.description = source ? source : "";
		} else if (type === ApplicationTreeItemType.Sources) {
			this.iconPath = new vscode.ThemeIcon("folder");
			this.description = "";
		} else if (type === ApplicationTreeItemType.Source) {
			this.iconPath = new vscode.ThemeIcon("outline-view-icon");
			this.description = this.type;
		}
	}
}


export class JinjaVariablesTreeProvider implements vscode.TreeDataProvider<JinjaVariableNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<JinjaVariableNode | undefined | void> = new vscode.EventEmitter<JinjaVariableNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<JinjaVariableNode | undefined | void> = this._onDidChangeTreeData.event;
	private appManager: SepticApplicationManager;

	constructor(appManager: SepticApplicationManager) {
		this.appManager = appManager;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: JinjaVariableNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: JinjaVariableNode): Promise<JinjaVariableNode[]> {
		if (!element) {
			return Promise.resolve(this.getJinjaVariables());
		}
	}

	private async getJinjaVariables(): Promise<JinjaVariableNode[]> {
		const scg = await this.appManager.getCurrentScgContext();
		if (!scg) {
			return undefined;
		}
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return undefined;
		}
		const filePath = activeEditor.document.uri.fsPath;
		const template = scg.layout.find((t) => t.name === path.basename(filePath));
		if (!template || template.source === undefined) {
			return undefined;
		}
		const source = await scg.getSourceById(template.source)
		const columns = await source.getHeaders();
		if (!columns) {
			return undefined;
		}
		return columns.map(column => new JinjaVariableNode(column, vscode.TreeItemCollapsibleState.None, source));
	}
}

export class JinjaVariableNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly source: ScgSource,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = label;
		this.description = `{{ ${label} }}`;
		this.contextValue = "scg.variable";
		this.command = {
			command: "editor.action.insertSnippet",
			title: "Insert at cursor",
			arguments: [{ snippet: `{{ ${label} }}` }]
		}

	}
}

export class SepticFunctionTreeProvider implements vscode.TreeDataProvider<SepticFunctionTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<SepticFunctionTreeItem | undefined | void> = new vscode.EventEmitter<SepticFunctionTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<SepticFunctionTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	private client: LanguageClient;

	constructor(client: LanguageClient) {
		this.client = client;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SepticFunctionTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SepticFunctionTreeItem): Promise<SepticFunctionTreeItem[]> {
		if (!element) {
			return Promise.resolve(this.getSepticFunctions());
		}
		return element.func.lines.map((line, index) => {
			let label = "";
			if (index === element.func.lines.length - 1) {
				label += line.doc
					? `   return ${line.alg} #${line.doc}\n`
					: `   return ${line.alg}\n`;
			} else {
				label += line.doc
					? `   ${line.name} = ${line.alg} #${line.doc}\n`
					: `   ${line.name} = ${line.alg}\n`;
			}
			return new SepticFunctionTreeItem(label, vscode.TreeItemCollapsibleState.None, element.func, SepticFunctionTreeItemType.Line);
		});
	}

	private async getSepticFunctions(): Promise<SepticFunctionTreeItem[]> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return undefined;
		}
		const functions: SepticFunction[] = await this.client.sendRequest('septic/getFunctions', { uri: activeEditor.document.uri.toString() });
		if (!functions) {
			return undefined;
		}
		return functions.map(func => new SepticFunctionTreeItem(`function ${func.name}(${func.inputs.join(", ")})`, vscode.TreeItemCollapsibleState.Collapsed, func, SepticFunctionTreeItemType.Definition));
	}
}

enum SepticFunctionTreeItemType {
	Definition = "definition",
	Line = "line"
}

export class SepticFunctionTreeItem extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly func: SepticFunction,
		public readonly type: SepticFunctionTreeItemType
	) {

		super(label, collapsibleState);
		this.contextValue = "septic.function";
	}
}