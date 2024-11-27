/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface SepticCalcResult extends vscode.ChatResult {
	metadata: {
		command: string;
		output: any;
	}
}
export async function calcChat(client: LanguageClient, request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<SepticCalcResult> {
	const uri = vscode.window.activeTextEditor?.document.uri.toString();
	const septicContext = await client.sendRequest(protocol.getContext, { uri: uri });
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
	const references = request.references.filter(ref => typeof ref.value === 'string').map(ref => ref.value) as string[];
	try {
		let attempts = 0;
		const previousResponses = getResponseHistory(context);
		const { messages } = await renderPrompt(SepticChatCalcPrompt, { calcs: documentation.calcs, variables: variables, responses: previousResponses, references: references, prompt: request.prompt }, { modelMaxPromptTokens: request.model.maxInputTokens }, request.model);
		const messagesUpdated = messages as vscode.LanguageModelChatMessage[];
		stream.progress("Creating calculation...");
		while (true) {
			const chatResponse = await request.model.sendRequest(messagesUpdated, {}, token);
			const response = await parseChatResponse(chatResponse);
			if (response.json) {
				stream.progress("Validating calculation...");
				const feedback = await validateCalculations(response, client, uri);
				if (!feedback.length) {
					const { messages } = await renderPrompt(SepticChatCalcOutputPrompt, { jsonInput: response.response }, { modelMaxPromptTokens: request.model.maxInputTokens }, request.model);
					const formattedResponse = await request.model.sendRequest(messages, {});
					for await (const fragment of formattedResponse.text) {
						stream.markdown(fragment);
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
	} catch {
		stream.markdown(vscode.l10n.t('I\'m sorry, unable to find the model.'));
	}
	return { metadata: { command: request.command, output: {} } };
}

function getResponseHistory(context: vscode.ChatContext): string[] {
	const messages: string[] = []
	const previousMessages = context.history.filter(h => h instanceof vscode.ChatResponseTurn) as vscode.ChatResponseTurn[];
	previousMessages.forEach(m => {
		let fullMessage = "";
		m.response.forEach(r => {
			const mdPart = r as vscode.ChatResponseMarkdownPart;
			fullMessage += mdPart.value.value;
		});
		messages.push(fullMessage);
	});
	return messages;
}

async function validateCalculations(response: { json?: any; response: string; }, client: LanguageClient, uri: string): Promise<any[]> {
	const feedback = [];
	const regexPattern = response.json.variables.join("|");
	const regex = new RegExp(regexPattern);
	for (const calc of response.json.calculations) {
		let diagnostics = await client.sendRequest(protocol.validateAlg, { calc: calc.calculation, uri: uri });
		diagnostics = diagnostics.filter(d => !((d.code.toString() === "W501" && d.message.search(regex)) || d.code.toString() === "W203"));
		if (!diagnostics.length) {
			continue;
		} else {
			const diagnosticMessages = diagnostics.map((diagnostic) => `${diagnostic.message} Start: ${diagnostic.range.start.character - 1} End: ${diagnostic.range.end.character - 1}`).join('\n');
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
	} catch {
		return { response: accumulatedResponse };
	}
}