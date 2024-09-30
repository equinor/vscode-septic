import * as vscode from 'vscode';
import { SepticCalcInfo } from './protocol';
import { renderPrompt } from '@vscode/prompt-tsx';
import {
	LanguageClient,
} from "vscode-languageclient/node";
import * as protocol from "./protocol";
import { SepticCalcPrompt } from './prompt';

export const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

export async function calcChat(client: LanguageClient, request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) {
	stream.progress("Retriveing documentation...");
	const documentation = await client.sendRequest(protocol.documentation, {});
	stream.progress("Looking for available variables...");
	const uri = vscode.window.activeTextEditor?.document.uri.toString();
	let variables;
	if (uri) {
		variables = await client.sendRequest(protocol.variables, { uri: uri });
	}
	if (!documentation) {
		return;
	}
	try {
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR)
		if (model) {
			stream.progress("Creating calculation...");
			const { messages, tokenCount } = await renderPrompt(SepticCalcPrompt, { userQuery: request.prompt, calcs: documentation.calcs, variables: variables }, { modelMaxPromptTokens: model.maxInputTokens }, model);
			console.log(`Max Tokens: ${model.maxInputTokens}`);
			console.log(`Tokens: ${tokenCount}`);
			const chatResponse = await model.sendRequest(messages, {}, token);
			for await (const fragment of chatResponse.text) {
				stream.markdown(fragment);
			}
		}
	} catch (e) {
		stream.markdown(vscode.l10n.t('I\'m sorry, unable to find the model.'));
	}
	return;
}
