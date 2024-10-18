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
	const uri = vscode.window.activeTextEditor?.document.uri.toString();
	let septicContext = await client.sendRequest(protocol.getContext, { uri: uri });
	if (septicContext.length) {
		const fileUri = vscode.Uri.parse(septicContext);
		stream.reference(fileUri);
	}
	stream.progress("Retriveing documentation...");
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
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR)
		if (model) {
			stream.progress("Creating calculation...");
			const { messages, tokenCount } = await renderPrompt(SepticCalcPrompt, { userQuery: request.prompt, calcs: documentation.calcs, variables: variables }, { modelMaxPromptTokens: model.maxInputTokens }, model);
			const messagesUpdated = messages as vscode.LanguageModelChatMessage[];
			const previousMessages = context.history.filter(h => h instanceof vscode.ChatResponseTurn) as vscode.ChatResponseTurn[];
			previousMessages.forEach(m => {
				let fullMessage = "";
				m.response.forEach(r => {
					const mdPart = r as vscode.ChatResponseMarkdownPart;
					fullMessage += mdPart.value.value;
				})
				messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
			})
			messagesUpdated.push(vscode.LanguageModelChatMessage.User(request.prompt));
			const chatResponse = await model.sendRequest(messagesUpdated, {}, token);
			for await (const fragment of chatResponse.text) {
				stream.markdown(fragment);
			}
		}
	} catch (e) {
		stream.markdown(vscode.l10n.t('I\'m sorry, unable to find the model.'));
	}
	return;
}