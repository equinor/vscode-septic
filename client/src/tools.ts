/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
import {
	LanguageClient,
} from "vscode-languageclient/node";
import * as protocol from "./protocol";
import * as YAML from "js-yaml";

export function registerChatTools(context: vscode.ExtensionContext, client: LanguageClient) {
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_validate_calculation", new ValidateCalculationTool(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_functions", new GetFunctions(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_variables", new GetVariables(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_scg_source", new GetScgSource(client)));
}

interface IValidateCalculationParameters {
	calculation: string;
	newVariables: string[];
}

export class ValidateCalculationTool implements vscode.LanguageModelTool<IValidateCalculationParameters> {
	private client: LanguageClient;
	constructor(client: LanguageClient) {
		this.client = client;
	}

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<IValidateCalculationParameters>,
		_token: vscode.CancellationToken
	) {
		const regexPattern = options.input.newVariables ? options.input.newVariables.join("|") : "";
		const regex = new RegExp(regexPattern);
		const uri = vscode.window.activeTextEditor?.document.uri.toString();
		let diagnostics = await this.client.sendRequest(protocol.validateAlg, { calc: options.input.calculation, uri: uri });
		diagnostics = diagnostics.filter(d => !((d.code.toString() === "W501" && d.message.search(regex)) || d.code.toString() === "W203"));
		if (!diagnostics.length) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`The calculation "${options.input.calculation}" is valid.`)]);

		}
		const diagnosticMessages = diagnostics.map((diagnostic) => `${diagnostic.message} Start: ${diagnostic.range.start.character - 1} End: ${diagnostic.range.end.character - 1}`).join(' ');
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`The following errors was found in the calculation ${options.input.calculation}: ${diagnosticMessages}`)]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<IValidateCalculationParameters>,
		_token: vscode.CancellationToken
	) {
		return {};
	}
}


export class GetFunctions implements vscode.LanguageModelTool<object> {
	private client: LanguageClient;
	constructor(client: LanguageClient) {
		this.client = client;
	}

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	) {
		const documentation = await this.client.sendRequest(protocol.documentation, {});
		const functions = documentation.calcs.map((calc) => {
			let description = calc.detailedDescription;
			description = description.replace((/(\r\n|\n|\r|<br>)/gm), "");
			if (description.length > 50) {
				description = description.slice(0, 75) + "...";
			}
			return `${calc.signature}: ${description}`;
		}).join('\n');
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Available functions that can be used in calculations:\n${functions}`)]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<object>,
		_token: vscode.CancellationToken
	) {
		return {};
	}
}

export class GetVariables implements vscode.LanguageModelTool<object> {
	private client: LanguageClient;
	constructor(client: LanguageClient) {
		this.client = client;
	}
	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	) {
		const uri = vscode.window.activeTextEditor?.document.uri.toString();
		const variables = await this.client.sendRequest(protocol.variables, { uri: uri });
		const variablesString = variables.map((variable) => {
			return `${variable.name}: ${variable.description}`;
		}).join('\n');
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Available variables in the current context with description:\n${variablesString}`)]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<object>,
		_token: vscode.CancellationToken
	) {
		return {};
	}
}

interface IGetScgSourceParameters {
	sourceId: string;
}

interface ScgConfig {
	outputfile?: string;
	templatepath: string;
	adjustspacing: boolean;
	verifycontent: boolean;
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

export class GetScgSource implements vscode.LanguageModelTool<IGetScgSourceParameters> {
	private client: LanguageClient;
	constructor(client: LanguageClient) {
		this.client = client;
	}

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<IGetScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		const uri = vscode.window.activeTextEditor?.document.uri.toString();
		const context = await this.client.sendRequest(protocol.getContext, { uri: uri });
		const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.parse(context));
		const scg = YAML.load(fileContent.toString()) as ScgConfig;
		const source = scg.sources.find(source => source.id === options.input.sourceId);
		if (!source) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`No scg source found with the id ${options.input.sourceId}`)]);
		}
		if (!source.filename.endsWith('.csv')) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`The source ${source.filename} is not a csv file`)]);
		}
		const contextUri = vscode.Uri.parse(context);
		const contextDir = vscode.Uri.joinPath(contextUri, '..');
		const sourcePath = vscode.Uri.joinPath(contextDir, source.filename);
		const sourceContent = await vscode.workspace.fs.readFile(sourcePath);
		const fileContentString = Buffer.from(sourceContent).toString('utf8');
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Content of the source file ${options.input.sourceId} in csv format: \n ${fileContentString}`)]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<IGetScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		return {

		};
	}
}