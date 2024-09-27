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
	const documentation = await client.sendRequest(protocol.documentation, {});
	if (!documentation) {
		return;
	}
	try {
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR)
		if (model) {
			const { messages } = await renderPrompt(SepticCalcPrompt, { userQuery: request.prompt, calcs: documentation.calcs }, { modelMaxPromptTokens: 4096 }, model);
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
