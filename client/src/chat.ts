/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { renderPrompt } from '@vscode/prompt-tsx';
import {
	LanguageClient,
} from "vscode-languageclient/node";
import * as protocol from "./protocol";
import { SepticChatCalcOutputPrompt, SepticChatCalcPrompt } from './prompts';

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

interface SepticCalcResult extends vscode.ChatResult {
	metadata: {
		command: string;
		output: any;
	}
}
export async function calcChat(client: LanguageClient, request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<SepticCalcResult> {
	const uri = vscode.window.activeTextEditor?.document.uri.toString();
	let septicContext = await client.sendRequest(protocol.getContext, { uri: uri });
	if (septicContext.length) {
		const fileUri = vscode.Uri.parse(septicContext);
		stream.reference(fileUri);
	}
	stream.progress("Retrieving documentation...");
	const documentation = await client.sendRequest(protocol.documentation, {});
	if (!documentation) {
		return;
	}
	stream.progress("Looking for available variables...");
	let variables;
	if (uri) {
		variables = await client.sendRequest(protocol.variables, { uri: uri });
	}
	try {
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
		if (model) {
			let attempts = 0;
			const { messages, tokenCount } = await renderPrompt(SepticChatCalcPrompt, { calcs: documentation.calcs, variables: variables }, { modelMaxPromptTokens: model.maxInputTokens }, model);
			const messagesUpdated = messages as vscode.LanguageModelChatMessage[];
			const previousMessages = context.history.filter(h => h instanceof vscode.ChatResponseTurn) as vscode.ChatResponseTurn[];
			previousMessages.forEach(m => {
				let fullMessage = "";
				m.response.forEach(r => {
					const mdPart = r as vscode.ChatResponseMarkdownPart;
					fullMessage += mdPart.value.value;
				});
				messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
			});
			messagesUpdated.push(vscode.LanguageModelChatMessage.User(request.prompt));
			stream.progress("Creating calculation...");
			while (true) {
				const chatResponse = await model.sendRequest(messagesUpdated, {}, token);
				const response = await parseChatResponse(chatResponse);
				if (response.json) {
					stream.progress("Validating calculation...");
					let feedback = await validateCalculations(response, client, uri);
					if (!feedback.length) {
						const { messages, tokenCount } = await renderPrompt(SepticChatCalcOutputPrompt, { jsonInput: response.response }, { modelMaxPromptTokens: model.maxInputTokens }, model);
						const formattedResponse = await model.sendRequest(messages, {});
						let accumulatedResponse = "";
						for await (const fragment of formattedResponse.text) {
							stream.markdown(fragment);
							accumulatedResponse += fragment;
						}
						return { metadata: { command: request.command, output: response.json.calculations } };
					}
					messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(response.response));
					messagesUpdated.push(vscode.LanguageModelChatMessage.User("Invalid calculation. Please try again. The following errors were found:"));
					messagesUpdated.push(vscode.LanguageModelChatMessage.User(JSON.stringify(feedback)));

				} else {
					messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(response.response));
					messagesUpdated.push(vscode.LanguageModelChatMessage.User("Unable to construct JSON object. Please try again."));
				}
				attempts++;
				if (attempts > 3) {
					stream.markdown(vscode.l10n.t('Unable to generate calculation'));
					break;
				}
				stream.progress("Re-attempting to create calculation...");
			}

		}
	} catch (e) {
		stream.markdown(vscode.l10n.t('I\'m sorry, unable to find the model.'));
	}
	return { metadata: { command: request.command, output: {} } };
}

async function validateCalculations(response: { json?: any; response: string; }, client: LanguageClient, uri: string): Promise<any[]> {
	let feedback = [];
	const regexPattern = response.json.variables.join("|");
	const regex = new RegExp(regexPattern);
	for (const calc of response.json.calculations) {
		let diagnostics = await client.sendRequest(protocol.validateAlg, { calc: calc.calculation, uri: uri });
		diagnostics = diagnostics.filter(d => !((d.code.toString() === "W501" && d.message.search(regex)) || d.code.toString() === "W203"));
		if (!diagnostics.length) {
			continue;
		} else {
			let diagnosticMessages = diagnostics.map((diagnostic) => `${diagnostic.message} Start: ${diagnostic.range.start.character - 1} End: ${diagnostic.range.end.character - 1}`).join('\n');
			feedback.push({ "name": calc.name, "message": `Invalid calculation. The following errors in the calculation was found (with position in):\n ${diagnosticMessages}\nPlease generate a new calculation that fixes the errors.` });
		}
	}
	return feedback;
}

async function parseChatResponse(
	chatResponse: vscode.LanguageModelChatResponse,
): Promise<{ json?: any, response: string }> {
	let accumulatedResponse = '';
	for await (const fragment of chatResponse.text) {
		accumulatedResponse += fragment;
	}
	try {
		const calculation = JSON.parse(accumulatedResponse);
		return { json: calculation, response: accumulatedResponse };
	} catch (e) {
		return { response: accumulatedResponse };
	}
}