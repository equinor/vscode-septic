/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
import {
	LanguageClient,
} from "vscode-languageclient/node";
import * as protocol from "./protocol";
import * as YAML from "js-yaml";
import { isScgConfig, ScgConfig, ScgSource } from './scg';

export function registerChatTools(context: vscode.ExtensionContext, client: LanguageClient) {
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_validate_calculation", new ValidateCalculationTool(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_functions", new GetFunctions(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_variables", new GetVariables(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_get_scg_source", new GetScgSource(client)));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_update_scg_source", new UpdateScgSource()));
	context.subscriptions.push(vscode.lm.registerTool("septic-tools_modify_scg_source", new ModifyScgSource()));
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
	file: string;
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
		try {
			const source = new ScgSource(options.input.file);
			await source.read();
			const headers = source.getHeaders();
			const indexes = source.getIndexes();
			const content = source.data.map((line) => line.join(";")).join("\n");
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Content of the source file ${options.input.file} in csv format with delimiter ';': \n ${content} \n Headers: ${headers.join(", ")} \n Indexes: ${indexes.join(", ")}`)]);
		} catch (error) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(error.message)]);
		}
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<IGetScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		return {

		};
	}
}

interface IUpdateScgSourceParameters {
	file: string;
	updates: {
		index: string;
		column: string;
		value: string;
	}[];
}

export class UpdateScgSource implements vscode.LanguageModelTool<IUpdateScgSourceParameters> {
	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<IUpdateScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		let source: ScgSource;
		try {
			source = new ScgSource(options.input.file);
			await source.read();
		} catch (error) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(error.message)]);
		}
		const messages = [];
		options.input.updates.forEach((update) => {
			try {
				source.updateValue(update.index, update.column, update.value);
				messages.push(`Succesfully update: Index: ${update.index}, Column: ${update.column}, Value: ${update.value}`);
			} catch (error) {
				messages.push(`Failed update: Index: ${update.index}, Column: ${update.column}, Value: ${update.value} - ${error.message}`);
			}

		});
		await source.write();
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`The source file ${options.input.file} has been updated: \n ${messages.join('\n')}`)]);

	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<IUpdateScgSourceParameters>,
		_token: vscode.CancellationToken) {
		const confirmationMessages = {
			title: `Update scg source: ${options.input.file}`,
			message: new vscode.MarkdownString(
				`Update the source file with the following changes: \n` +
				options.input.updates.map(update => `- Index: ${update.index}, Column: ${update.column}, Value: ${update.value}`).join('\n')
			)
		}
		return {
			invocationMessage: "Updateting SCG source",
			confirmationMessages
		};
	}
}

interface IModifyScgSourceParameters {
	file: string;
	direction: "row" | "column";
	action: "add" | "delete";
	id: string;
	values?: string[];
}

export class ModifyScgSource implements vscode.LanguageModelTool<IModifyScgSourceParameters> {
	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<IModifyScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		let source: ScgSource;
		try {
			source = new ScgSource(options.input.file);
			await source.read();
		} catch (error) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(error.message)]);
		}
		let message;
		if (options.input.action === "add") {
			if (options.input.direction === "row") {
				try {
					source.addRow(options.input.id, options.input.values);
					message = new vscode.LanguageModelTextPart(`The source file ${options.input.file} has been modified. A new row with index ${options.input.id} has been added.`);
				} catch (error) {
					message = new vscode.LanguageModelTextPart(`Failed to add row - ${error.message}`);
				}
			} else {
				try {
					source.addColumn(options.input.id, options.input.values);
					message = new vscode.LanguageModelTextPart(`The source file ${options.input.file} has been modified. A new column with name ${options.input.id} has been added.`);
				} catch (error) {
					message = new vscode.LanguageModelTextPart(`Failed to add column - ${error.message}`);
				}
			}
		} else if (options.input.action === "delete" && options.input.id) {
			if (options.input.direction === "column") {
				try {
					source.deleteRow(options.input.id);
					message = new vscode.LanguageModelTextPart(`The source file ${options.input.file} has been modified. The row with index ${options.input.id} has been deleted.`);
				} catch (error) {
					message = new vscode.LanguageModelTextPart(`Failed to delete row - ${error.message}`);
				}
			} else {
				try {
					source.deleteColumn(options.input.id);
					message = new vscode.LanguageModelTextPart(`The source file ${options.input.file} has been modified. The column with name ${options.input.id} has been deleted.`);
				} catch (error) {
					message = new vscode.LanguageModelTextPart(`Failed to delete column - ${error.message}`);
				}
			}
		} else {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`No row found with index ${options.input.id}`)]);
		}
		await source.write();
		return new vscode.LanguageModelToolResult([message]);
	}

	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<IModifyScgSourceParameters>,
		_token: vscode.CancellationToken
	) {
		let title: string;
		let message: vscode.MarkdownString;

		if (options.input.action === "add") {
			if (options.input.direction === "row") {
				title = `Add row to scg source: ${options.input.file}?`;
				message = new vscode.MarkdownString(
					`Add a new row with index ${options.input.id}: \n` +
					options.input.values?.join(";")
				);
			} else {
				title = `Add column to scg source: ${options.input.file}?`;
				message = new vscode.MarkdownString(
					`Add a new column with name ${options.input.id}: \n` +
					options.input.values?.join(";")
				);
			}
		} else {
			if (options.input.direction === "row") {
				title = `Delete row from scg source: ${options.input.file}?`;
				message = new vscode.MarkdownString(
					`Delete row with index ${options.input.id}`
				);
			} else {
				title = `Delete column from scg source: ${options.input.file}?`;
				message = new vscode.MarkdownString(
					`Delete column with name ${options.input.id}`
				);
			}
		}
		const confirmationMessages = {
			title: title,
			message: message
		};
		return {
			invocationMessage: "Modifying SCG source",
			confirmationMessages
		};
	}
}
