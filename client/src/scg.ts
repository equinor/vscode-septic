import * as yaml from 'js-yaml';
import * as vscode from 'vscode';

export interface ScgConfig {
	outputfile?: string;
	templatepath: string;
	adjustspacing?: boolean;
	verifycontent?: boolean;
	counters?: {
		name: string;
		value: number;
	}[]
	sources: {
		filename: string;
		id: string;
		sheet?: string;
		delimiter?: string;
	}[]
	layout: {
		name: string;
		source?: string;
		include?: object;
	}[]
}

export async function isScgConfig(filePath: string): Promise<boolean> {
	try {
		const uri = vscode.Uri.file(filePath);
		const document = await vscode.workspace.openTextDocument(uri);
		const fileContents = document.getText();
		const data = yaml.load(fileContents) as ScgConfig;

		// Validate required fields
		if (!data.templatepath || typeof data.templatepath !== 'string') return false;
		if (data.adjustspacing && typeof data.adjustspacing !== 'boolean') return false;
		if (data.verifycontent && typeof data.verifycontent !== 'boolean') return false;

		// Validate optional fields
		if (data.outputfile && typeof data.outputfile !== 'string') return false;

		// Validate counters
		if (data.counters) {
			for (const counter of data.counters) {
				if (typeof counter.name !== 'string' || typeof counter.value !== 'number') return false;
			}
		}

		// Validate sources
		for (const source of data.sources) {
			if (typeof source.filename !== 'string' || typeof source.id !== 'string') return false;
			if (source.sheet && typeof source.sheet !== 'string') return false;
			if (source.delimiter && typeof source.delimiter !== 'string') return false;
		}

		// Validate layout
		for (const layout of data.layout) {
			if (typeof layout.name !== 'string') return false;
			if (layout.source && typeof layout.source !== 'string') return false;
			if (layout.include && typeof layout.include !== 'object') return false;
		}

		return true;
	} catch {
		return false;
	}
}

export async function findScgConfigFiles(): Promise<vscode.Uri[]> {
	try {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return [];
		}
		let currentFolder = vscode.Uri.file(activeEditor.document.uri.fsPath).with({ path: vscode.Uri.file(activeEditor.document.uri.fsPath).path.replace(/\/[^/]+$/, '') });
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

		while (currentFolder.fsPath.startsWith(workspaceFolder || '') && currentFolder.fsPath !== workspaceFolder) {
			const files = await vscode.workspace.findFiles(new vscode.RelativePattern(currentFolder, '*.yaml'));
			const scgConfigFiles: vscode.Uri[] = [];
			for (const file of files) {
				if (await isScgConfig(file.fsPath)) {
					scgConfigFiles.push(file);
				}
			}
			if (scgConfigFiles.length > 0) {
				return scgConfigFiles;
			}
			currentFolder = vscode.Uri.file(currentFolder.fsPath).with({ path: vscode.Uri.file(currentFolder.fsPath).path.replace(/\/[^/]+$/, '') });
		}
		return [];
	} catch (error) {
		console.error('Error finding SCG config files:', error);
		return [];
	}
}


export class ScgSource {
	filename: string;
	delimiter: string;
	data: string[][] | undefined;

	constructor(filename: string, delimiter: string = ";") {
		this.filename = filename;
		this.delimiter = delimiter;
	}

	async read(): Promise<void> {
		const uri = vscode.Uri.file(this.filename);
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const fileContents = document.getText();
			const lines = fileContents.split('\n');
			const linesTrimmed = lines.map(line => line.trim());
			const data = linesTrimmed.map(line => line.split(this.delimiter).map(value => value.trim()));
			this.data = data;
		} catch {
			throw new Error(`Could not open the file ${this.filename}`);
		}
	}

	async write(): Promise<void> {
		if (!this.data) {
			throw new Error('No data to write');
		}
		const uri = vscode.Uri.file(this.filename);
		try {
			await vscode.workspace.fs.writeFile(uri, Buffer.from(this.data.map(row => row.join(this.delimiter)).join('\n')));
		} catch {
			throw new Error(`Could not write to the file ${this.filename}`);
		}
	}

	updateValue(index: string, column: string, value: string): void {
		if (!this.data) {
			throw new Error('No data to update');
		}
		const header = this.data[0];
		const rowIndex = this.data.findIndex(row => row[0] === index);
		if (rowIndex === -1) {
			throw new Error(`The row ${index} does not exist`);
		}
		const columnIndex = header.findIndex(col => col === column);
		if (columnIndex === -1) {
			throw new Error(`The column ${column} does not exist`);
		}
		this.data[rowIndex][columnIndex] = value;
	}

	addRow(index: string, values: string[]): void {
		if (!this.data) {
			throw new Error('No data to update');
		}
		const header = this.data[0];
		if (this.data.some(row => row[0] === index)) {
			throw new Error(`The row ${index} already exists`);
		}
		if (values.length !== header.length - 1) {
			throw new Error(`The number of values does not match the number of columns. Expected ${header.length - 1}, got ${values.length}`);
		}
		this.data.push([index, ...values]);
	}

	deleteRow(index: string): void {
		if (!this.data) {
			throw new Error('No data to update');
		}
		const rowIndex = this.data.findIndex(row => row[0] === index);
		if (rowIndex === -1) {
			throw new Error(`The row ${index} does not exist`);
		}
		this.data.splice(rowIndex, 1);
	}

	addColumn(column: string, values: string[]): void {
		if (!this.data) {
			throw new Error('No data to update');
		}
		const header = this.data[0];
		if (this.data[0].includes(column)) {
			throw new Error(`The column ${column} already exists`);
		}
		if (values.length !== this.data.length - 1) {
			throw new Error(`The number of values does not match the number of rows. Expected ${this.data.length - 1}, got ${values.length}`);
		}
		header.push(column);
		for (let i = 1; i < this.data.length; i++) {
			this.data[i].push(values[i - 1]);
		}
	}

	deleteColumn(column: string): void {
		if (!this.data) {
			throw new Error('No data to update');
		}
		const header = this.data[0];
		const columnIndex = header.findIndex(col => col === column);
		if (columnIndex === -1) {
			throw new Error(`The column ${column} does not exist`);
		}
		header.splice(columnIndex, 1);
		for (let i = 1; i < this.data.length; i++) {
			this.data[i].splice(columnIndex, 1);
		}
	}

	getHeaders(): string[] {
		if (!this.data) {
			throw new Error('No data to get headers');
		}
		return this.data[0];
	}

	getIndexes(): string[] {
		if (!this.data) {
			throw new Error('No data to get indexes');
		}
		return this.data.slice(1).map(row => row[0]);
	}
}