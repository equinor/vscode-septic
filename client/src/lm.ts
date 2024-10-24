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
			while (true) {
				const chatResponse = await model.sendRequest(messagesUpdated, {});
				let response = await parseChatResponse(chatResponse);
				if (response.calculation) {
					let diagnostics = await client.sendRequest(protocol.validateAlg, { calc: response.calculation.calculation, uri: uri });
					if (!diagnostics.length) {
						insertCalculation(response.calculation.calculation, start, end);
						break;
					}
					messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(response.response));
					let diagnosticMessages = diagnostics.map((diagnostic) => `${diagnostic.message} Start: ${diagnostic.range.start.character - 1} End: ${diagnostic.range.end.character - 1}`).join('\n');
					messagesUpdated.push(vscode.LanguageModelChatMessage.User(`Invalid calculation. The following errors in the calculation was found (with position in):\n ${diagnosticMessages}\nPlease generate a new calculation that fixes the errors.`));
				} else {
					messagesUpdated.push(vscode.LanguageModelChatMessage.Assistant(response.response))
					messagesUpdated.push(vscode.LanguageModelChatMessage.User("Unable to construct JSON object. Please try again."));
				}
				attempts++;
				if (attempts > 3) {
					vscode.window.showWarningMessage('Unable to generate calculation');
					break;
				}
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