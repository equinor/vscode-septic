/* eslint-disable @typescript-eslint/no-unused-vars */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples/chat-sample]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	AssistantMessage,
	BasePromptElementProps,
	Chunk,
	PrioritizedList,
	PromptElement,
	PromptElementProps,
	PromptMetadata,
	PromptPiece,
	PromptReference,
	PromptSizing,
	ToolCall,
	ToolMessage,
	UserMessage,
	SystemMessage
} from '@vscode/prompt-tsx';
import { ToolResult } from '@vscode/prompt-tsx/dist/base/promptElements';
import * as vscode from 'vscode';
import { isTsxToolUserMetadata } from './chatParticipant';
import { LanguageClient } from 'vscode-languageclient/node';
import * as protocol from './protocol';

export interface ToolCallRound {
	response: string;
	toolCalls: vscode.LanguageModelToolCallPart[];
}

export interface ToolUserProps extends BasePromptElementProps {
	request: vscode.ChatRequest;
	context: vscode.ChatContext;
	client: LanguageClient;
	toolCallRounds: ToolCallRound[];
	toolCallResults: Record<string, vscode.LanguageModelToolResult>;
}

export class ToolUserPrompt extends PromptElement<ToolUserProps, void> {
	render(_state: void, _sizing: PromptSizing) {
		let instructions;
		switch (this.props.request.command) {
			case 'calculation':
				instructions = <CalculationInstructions priority={100}/>;
				break;
			case 'scg':
				instructions = <ScgInstructions client={this.props.client} priority={100}/>;
				break;
			// Add more cases here for different commands
			default:
				instructions = <UserMessage priority={100}>No specific instructions available for this command.</UserMessage>;
		}

		return (
			<>
				<History context={this.props.context} priority={10} />
				<PromptReferences
					references={this.props.request.references}
					priority={20}
				/>
				{instructions}
				<UserMessage priority={100}>
					Instructions: <br />
					- The user will ask a question, or ask you to perform a task, and it may
					require lots of research to answer correctly. There is a selection of
					tools that let you perform actions or retrieve helpful context to answer
					the user's question. <br />
					- If you aren't sure which tool is relevant, you can call multiple
					tools. You can call tools repeatedly to take actions or gather as much
					context as needed until you have completed the task fully. Don't give up
					unless you are sure the request cannot be fulfilled with the tools you
					have. <br />
					- Don't make assumptions about the situation- gather context first, then
					perform the task or answer the question. <br />
					- Don't ask the user for confirmation to use tools, just use them. <br />
					- Use all the necessary tools before responding to the user. <br />
				</UserMessage>
				<UserMessage priority={90}>{this.props.request.prompt}</UserMessage>
				<ToolCalls
					toolCallRounds={this.props.toolCallRounds}
					toolInvocationToken={this.props.request.toolInvocationToken}
					toolCallResults={this.props.toolCallResults} />
			</>
		);
	}
}

interface ToolCallsProps extends BasePromptElementProps {
	toolCallRounds: ToolCallRound[];
	toolCallResults: Record<string, vscode.LanguageModelToolResult>;
	toolInvocationToken: vscode.ChatParticipantToolToken | undefined;
}

const dummyCancellationToken: vscode.CancellationToken = new vscode.CancellationTokenSource().token;

/**
 * Render a set of tool calls, which look like an AssistantMessage with a set of tool calls followed by the associated UserMessages containing results.
 */
class ToolCalls extends PromptElement<ToolCallsProps, void> {
	async render(_state: void, _sizing: PromptSizing) {
		if (!this.props.toolCallRounds.length) {
			return undefined;
		}

		// Note- for the copilot models, the final prompt must end with a non-tool-result UserMessage
		return <>
			{this.props.toolCallRounds.map(round => this.renderOneToolCallRound(round))}
			<UserMessage>Above is the result of calling one or more tools. The user cannot see the results, so you should explain them to the user if referencing them in your answer.</UserMessage>
		</>;
	}

	private renderOneToolCallRound(round: ToolCallRound) {
		const assistantToolCalls: ToolCall[] = round.toolCalls.map(tc => ({ type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input) }, id: tc.callId }));
		return (
			<Chunk>
				<AssistantMessage toolCalls={assistantToolCalls}>{round.response}</AssistantMessage>
				{round.toolCalls.map(toolCall =>
					<ToolResultElement toolCall={toolCall} toolInvocationToken={this.props.toolInvocationToken} toolCallResult={this.props.toolCallResults[toolCall.callId]} />)}
			</Chunk>);
	}
}

interface ToolResultElementProps extends BasePromptElementProps {
	toolCall: vscode.LanguageModelToolCallPart;
	toolInvocationToken: vscode.ChatParticipantToolToken | undefined;
	toolCallResult: vscode.LanguageModelToolResult | undefined;
}

/**
 * One tool call result, which either comes from the cache or from invoking the tool.
 */
class ToolResultElement extends PromptElement<ToolResultElementProps, void> {
	async render(state: void, sizing: PromptSizing): Promise<PromptPiece | undefined> {
		const tool = vscode.lm.tools.find(t => t.name === this.props.toolCall.name);
		if (!tool) {
			console.error(`Tool not found: ${this.props.toolCall.name}`);
			return <ToolMessage toolCallId={this.props.toolCall.callId}>Tool not found</ToolMessage>;
		}

		const tokenizationOptions: vscode.LanguageModelToolTokenizationOptions = {
			tokenBudget: sizing.tokenBudget,
			countTokens: async (content: string) => sizing.countTokens(content),
		};

		const toolResult = this.props.toolCallResult ??
			await vscode.lm.invokeTool(this.props.toolCall.name, { input: this.props.toolCall.input, toolInvocationToken: this.props.toolInvocationToken, tokenizationOptions }, dummyCancellationToken);

		return (
			<ToolMessage toolCallId={this.props.toolCall.callId}>
				<meta value={new ToolResultMetadata(this.props.toolCall.callId, toolResult)}></meta>
				<ToolResult data={toolResult} />
			</ToolMessage>
		);
	}
}

export class ToolResultMetadata extends PromptMetadata {
	constructor(
		public toolCallId: string,
		public result: vscode.LanguageModelToolResult,
	) {
		super();
	}
}

interface HistoryProps extends BasePromptElementProps {
	priority: number;
	context: vscode.ChatContext;
}

/**
 * Render the chat history, including previous tool call/results.
 */
class History extends PromptElement<HistoryProps, void> {
	render(_state: void, _sizing: PromptSizing) {
		return (
			<PrioritizedList priority={this.props.priority} descending={false}>
				{this.props.context.history.map((message) => {
					if (message instanceof vscode.ChatRequestTurn) {
						return (
							<>
								{<PromptReferences references={message.references} excludeReferences={true} />}
								<UserMessage>{message.prompt}</UserMessage>
							</>
						);
					} else if (message instanceof vscode.ChatResponseTurn) {
						const metadata = message.result.metadata;
						if (isTsxToolUserMetadata(metadata) && metadata.toolCallsMetadata.toolCallRounds.length > 0) {
							return <ToolCalls toolCallResults={metadata.toolCallsMetadata.toolCallResults} toolCallRounds={metadata.toolCallsMetadata.toolCallRounds} toolInvocationToken={undefined} />;
						}

						return <AssistantMessage>{chatResponseToString(message)}</AssistantMessage>;
					}
				})}
			</PrioritizedList>
		);
	}
}

/**
 * Convert the stream of chat response parts into something that can be rendered in the prompt.
 */
function chatResponseToString(response: vscode.ChatResponseTurn): string {
	return response.response
		.map((r) => {
			if (r instanceof vscode.ChatResponseMarkdownPart) {
				return r.value.value;
			} else if (r instanceof vscode.ChatResponseAnchorPart) {
				if (r.value instanceof vscode.Uri) {
					return r.value.fsPath;
				} else {
					return r.value.uri.fsPath;
				}
			}

			return '';
		})
		.join('');
}

interface PromptReferencesProps extends BasePromptElementProps {
	references: ReadonlyArray<vscode.ChatPromptReference>;
	excludeReferences?: boolean;
}

/**
 * Render references that were included in the user's request, eg files and selections.
 */
class PromptReferences extends PromptElement<PromptReferencesProps, void> {
	render(_state: void, _sizing: PromptSizing): PromptPiece {
		return (
			<UserMessage>
				{this.props.references.map(ref => (
					<PromptReferenceElement ref={ref} excludeReferences={this.props.excludeReferences} />
				))}
			</UserMessage>
		);
	}
}

interface PromptReferenceProps extends BasePromptElementProps {
	ref: vscode.ChatPromptReference;
	excludeReferences?: boolean;
}

class PromptReferenceElement extends PromptElement<PromptReferenceProps> {
	async render(_state: void, _sizing: PromptSizing): Promise<PromptPiece | undefined> {
		const value = this.props.ref.value;
		if (value instanceof vscode.Uri) {
			const fileContents = (await vscode.workspace.fs.readFile(value)).toString();
			return (
				<Tag name="context">
					{!this.props.excludeReferences && <references value={[new PromptReference(value)]} />}
					{value.fsPath}:<br />
					``` <br />
					{fileContents}<br />
					```<br />
				</Tag>
			);
		} else if (value instanceof vscode.Location) {
			const rangeText = (await vscode.workspace.openTextDocument(value.uri)).getText(value.range);
			return (
				<Tag name="context">
					{!this.props.excludeReferences && <references value={[new PromptReference(value)]} />}
					{value.uri.fsPath}:{value.range.start.line + 1}-$<br />
					{value.range.end.line + 1}: <br />
					```<br />
					{rangeText}<br />
					```
				</Tag>
			);
		} else if (typeof value === 'string') {
			return <Tag name="context">{value}</Tag>;
		}
	}
}

type TagProps = PromptElementProps<{
	name: string;
}>;

class Tag extends PromptElement<TagProps> {
	private static readonly _regex = /^[a-zA-Z_][\w.-]*$/;

	render() {
		const { name } = this.props;

		if (!Tag._regex.test(name)) {
			throw new Error(`Invalid tag name: ${this.props.name}`);
		}

		return (
			<>
				{'<' + name + '>'}<br />
				<>
					{this.props.children}<br />
				</>
				{'</' + name + '>'}<br />
			</>
		);
	}
}


class CalculationInstructions extends PromptElement<object> {
	render() {
		return (
			<UserMessage priority={this.props.priority}>
					Calculation instructions: <br />
					- Septic configuration supports execution of calculations. A calculation is written as a string inside a calculation object and the content of the string is executed by the MPC.<br />
					- Format of calculation object: <br />
					CalcPvr:   %calculation name % <br />
					Text1=  "% description %" <br />
					Text2=  "" <br />
					Alg= "% calculation %"
					- The calculation is written in a simple language that supports basic arithmetic operations, variables, and functions. The following rules apply and most be strictly followed: <br />
					%%% start rules %%% <br />
					- Supported operators: +, -, *, /, % <br />
					- Supported comparison operators: ==, {'>'}, {'>='}, {'<='}, {'<'} <br />
					- Supported logical functions: and(condition1, condition2, ..., conditionN), or(condition1, condition2, ..., conditionN), not(condition) <br />
					- Grouping with parentheses: (...) <br />
					- Variables: Refers to objects in the configuration file. It is allowed with jinja expressions in variable names, but not only jinja. Example: {`{{ Jinja }}`}VariableName <br />
					- All non-zero values are considered true <br />
					- There is a set of available functions. All functions returns a float <br />
					- Arguments to function are separated by commas <br />
					- Calculations are insensitive to whitespace <br />
					- The if function is written as follows: if(condition, true_value, false_value) both true_value and false_value are evaluated, but only the correct one is returned, thus functions that sets values must not be used within the if function and instead get the result of the if function as input. <br />
					%%% end rules %%% <br />
					%%% examples %%% <br />
					Examples of correct calculations: <br />
					setmeas(Var1, if(Var2 {'>'} Var1, Var2, Var3)) <br />
					setmode(Var1, if(getmode(Var1) {'>'} 3, 3, 0),1)<br />
					and(Var2 {'>'} Var1, Var3 == 1)<br />
					or(Var2 {'>'} Var1, Var3 == 1)<br />
					Examples of incorrect calculations: <br />
					if(Var2 {'>'} Var1, setmeas(Var1, Var2), Var3)<br />
					if(getmode(Var1) {'>'} 3, setmode(Var1, 3), setmode(Var1, 1))<br />
					Var2 {'>'} Var1 and Var3 == 1<br />
					Var2 {'>'} Var1 or Var3 == 1<br />
					%%% end examples %%% <br />
					- Use the available tools to get the relevant functions and variables. Never ask for confirmation to use the tools. <br />
					- Always validate all calculations. Repeat the validation after each change. Never ask for confirmation to use the tool. <br />
					- If the calculation require new variables not in the context, provide a list of the new variables that needs to be added when validating the calculation. <br />
					- The calculation result is stored in a variable if a variable with the same name as the calculation object is defined in the configuration as an Evr. Always add new variables to store the result of the calculations <br />
					- Summarize the all calculations and new variables when the results are ready. Format new variables as Evr objects. Group variables and calculation such that it is easy for the user to insert into the configuration  <br />
					- Always validate all calculations. Repeat the validation after each change. Never ask for confirmation to use the tool. <br />
				</UserMessage>
		);
	}
}

interface ScgInstructionsProps extends BasePromptElementProps {
	client: LanguageClient;
}

class ScgInstructions extends PromptElement<ScgInstructionsProps> {
	async render() {
		const uri = vscode.window.activeTextEditor?.document.uri.toString();
		const context = await this.props.client.sendRequest(protocol.getContext, {uri: uri});
		const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.parse(context));
		const fileText = Buffer.from(fileContent).toString('utf8');
		return (
			<UserMessage priority={this.props.priority}>
					Septic Config Generator: <br />
					- Septic Config Generator (SCG) is a tool that enables generating Septic config files based on a set of templates that use information from one or more sources<br />
					- SCG is based on the MiniJinja template engine that use the syntax and behavior of the Jinja2 template engine<br />
					- A context is defined by a configuration file in yaml format that contains the information that the SCG tool need to generate the config files<br />
					%%% start example scg config %%% <br />
					outputfile: example.cnfg <br />
					templatepath: templates <br />
					adjustspacing: true <br />
					verifycontent: true <br />
					<br />
					counters: <br />
					- name: mycounter <br />
						value: 0 <br />
						<br />
					sources: <br />
					- filename: example.xlsx <br />
						id: wells <br />
						sheet: Sheet1 <br />
					- filename: example.csv <br />
						id: flowlines <br />
						delimiter: ";" <br />
						<br />
					layout: <br />
					- name: 010_System.cnfg <br />
					- name: 020_SopcProc.cnfg <br />
					- name: 030_SopcProc_well.cnfg <br />
						source: wells <br />
						include: <br />
						- D01 <br />
						- D02 <br />
					- name: 040_SopcProc_flowline.cnfg <br />
						source: flowlines <br />
					%%% end example scg config %%% <br />
					- outputfile (optional string): The file that will be generated. Writes to stdout if not provided. <br />
					- templatepath (string): The directory that contains all template files. <br />
					- adjustspacing (boolean, default: true): Specifies whether to ensure exactly one newline between rendered template files. If false, then the rendering will default to MiniJinja's behaviour. <br />
					- verifycontent (boolean, default: true): Whether to report differences from an already existing rendered file. Will ask before replacing with the new content. Set to false to overwrite existing file without checking for changes. <br />
					- counters (optional list of counter structs): Contains a list of global auto-incrementing counter functions. <br />
					- sources (list of source structs): Contains a list of source file configurations. <br />
					- layout (list of template structs): Contains a list of templates in the order they should be rendered. <br />
					{'<' + "Active SCG context configuration" + '>'}<br />
					{fileText}<br />
					{'</' + "Active SCG context configuration" + '>'}<br />
					Instructions:
					- Use the available tools to get the correct information to fullfill the user request. <br />
					- Always read in a source file before updating the values to check column and index names if not already in the context. <br />
					- The content of a source file is in csv format. The first row of the source file is the header (column names) and the first column is the index (row names). <br />
					- Always combine all updates to a source file in one call to the tool. <br /> 
					- Answer only based on the information in the context. <br />
					- Always use jinja2 formatting in the templates. <br />
				</UserMessage>
		);
	}
}