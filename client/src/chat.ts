import * as vscode from 'vscode';

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

const septicPrePromt: vscode.LanguageModelChatMessage = vscode.LanguageModelChatMessage.User(
	`You are an expert on the Septic advanced process control software. Septic is a MPC that support custom applications. The custom application is described in a configuration file that have the following format:

	<- start configuration format ->
	An object is defined as follows:
	
	ObjectType:  ObjectName
		Attribute1: Value1
		Attribute2: Value2
		...
		AttributeN: ValueN
	
	Attributes: have different names and values. 
	Available attribute values are:
		string: "..."
		numerical: 0.01, 1, 1e-3 etc
		enums: ENUM1, ENUM2, ENUM3 etc (capital letters)
		list: number of items followed by the items in the list separated by spaces
	<- end configuration format ->
	`
);

export async function chatHandler(request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<vscode.ChatResult | void> {
	try {
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR)
		if (model) {
			const messages = [
				septicPrePromt,
				vscode.LanguageModelChatMessage.User(request.prompt)
			];
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