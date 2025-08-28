import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path"
import { ScgConfig } from './scg';

export interface SepticApplication {
	name: string;
	path: string;
	scgConfigs: ScgConfig[];

}

export class SepticApplicationManager {
	private _onDidChangeApplication: vscode.EventEmitter<undefined | undefined | void> = new vscode.EventEmitter<undefined | undefined | void>();
	readonly onDidChangeApplication: vscode.Event<undefined | undefined | void> = this._onDidChangeApplication.event;
	private readonly context: vscode.ExtensionContext;
	private applications: SepticApplication[] | undefined = undefined;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	public async getApplications(): Promise<SepticApplication[] | undefined> {
		if (!this.applications) {
			this.applications = await this.findApplications();
		}
		return this.applications;
	}

	public async getApplicationByName(name: string): Promise<SepticApplication | undefined> {
		const applications = await this.getApplications();
		return applications?.find(app => app.name === name);
	}

	public async findApplications(): Promise<SepticApplication[]> {
		const rootPath =
			vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
				? vscode.workspace.workspaceFolders[0].uri.fsPath
				: undefined;
		if (!rootPath) {
			return []
		}
		function findApplicationDirs(dir: string, found: string[] = []): string[] {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					if (entry.name === 'scg') {
						found.push(dir);
					} else {
						findApplicationDirs(fullPath, found);
					}
				}
			}
			return found;
		}
		const applicationDirs = findApplicationDirs(rootPath);
		const applications: SepticApplication[] = [];
		for (const appDir of applicationDirs) {
			const appName = path.basename(appDir);
			const scgDir = path.join(appDir, 'scg');
			const scgConfigs: ScgConfig[] = [];
			if (fs.existsSync(scgDir)) {
				const files = fs.readdirSync(scgDir);
				for (const file of files) {
					if (file.endsWith('.yaml') || file.endsWith('.yml')) {
						const filePath = path.join(scgDir, file);
						const scgConfig = await ScgConfig.read(filePath);
						if (scgConfig) {
							scgConfigs.push(scgConfig);
						}
					}
				}
			}
			applications.push({ name: appName, path: appDir, scgConfigs });
		}
		return applications;
	}

	public async getCurrentApplication(): Promise<SepticApplication | undefined> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return undefined;
		}
		const filePath = activeEditor.document.uri.fsPath;
		const applications = await this.getApplications()
		return applications?.find(app => filePath.startsWith(app.path));
	}

	public async getCurrentScgContext(): Promise<ScgConfig | undefined> {
		const application = await this.getCurrentApplication();
		if (!application) {
			return undefined;
		}
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return undefined;
		}
		const filePath = activeEditor.document.uri.fsPath;
		return application.scgConfigs.find(config => filePath.startsWith(config.templatepath));
	}

	public async refreshApplications(): Promise<void> {
		this.applications = await this.findApplications();
		this._onDidChangeApplication.fire();
	}

	public async updateScgConfig(filename: string): Promise<void> {
		const applications = await this.getApplications();
		if (!applications) {
			return;
		}
		const config = applications.flatMap(app => app.scgConfigs).find(config => config.path === filename);
		if (!config) {
			return;
		}
		config.updateConfig();
		this._onDidChangeApplication.fire();
	}

}
