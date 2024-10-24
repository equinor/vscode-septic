import * as vscode from 'vscode';
import { renderPrompt } from '@vscode/prompt-tsx';
import {
	LanguageClient,
} from "vscode-languageclient/node";
import * as protocol from "./protocol";
import { SepticGenerateCalcPrompt } from './prompts';

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

export async function generateCalc(client: LanguageClient, description: string, start: vscode.Position, end: vscode.Position) {
	const uri = vscode.window.activeTextEditor?.document.uri.toString();
	const documentation = await client.sendRequest(protocol.documentation, {});
	if (!documentation) {
		return;
	}
	let variables;
	if (uri) {
		variables = await client.sendRequest(protocol.variables, { uri: uri });
	}

	try {
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
		if (model) {
			const { messages, tokenCount } = await renderPrompt(SepticGenerateCalcPrompt, { calcs: documentation.calcs, variables: variables }, { modelMaxPromptTokens: model.maxInputTokens }, model);
			const messagesUpdated = messages as vscode.LanguageModelChatMessage[];
			messagesUpdated.push(vscode.LanguageModelChatMessage.User(description));
			let attempts = 0
			while (attempts < 3) {
				const chatResponse = await model.sendRequest(messagesUpdated, {});
				let response = await parseChatResponse(chatResponse);
				if (response.calculation) {
					insertCalculation(response.calculation.calculation, start, end);
					console.log(attempts);
					break;
				}
				messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(response.response))
				messagesUpdated.push(vscode.LanguageModelChatMessage.User("Unable to construct JSON object. Please try again."));
				attempts++;
			}
		}

	} catch (e) {
		vscode.window.showInformationMessage('Unable to find the model');
	}
}

async function parseChatResponse(
	chatResponse: vscode.LanguageModelChatResponse,
): Promise<{ calculation?: any, response: string }> {
	let accumulatedResponse = '';
	for await (const fragment of chatResponse.text) {
		accumulatedResponse += fragment;
	}
	try {
		const calculation = JSON.parse(accumulatedResponse);
		return { calculation: calculation, response: accumulatedResponse };
	} catch (e) {
		return { response: accumulatedResponse };
	}
}

function insertCalculation(calculation: string, start: vscode.Position, end: vscode.Position) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	if (start.line === end.line && start.character === end.character) {
		editor.edit((editBuilder) => {
			editBuilder.insert(start, calculation);
		});
	} else {
		editor.edit((editBuilder) => {
			editBuilder.replace(new vscode.Range(start, end), calculation);
		});
	}

}