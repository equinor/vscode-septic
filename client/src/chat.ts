import * as vscode from 'vscode';
import { SepticCalcInfo } from './protocol';

export const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

export const septicPrePrompt: string =
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
		int: 1, 2, 3 etc
		float: 1.0, 2.0, 3.0 etc (with a decimal point) and scientific notation 1e-3, 2e-3, 3e-3 etc
		bitmask: 0000000000000000000000000000001 (32 bits), 0001 (4 bits) etc
		enums: ENUM1, ENUM2, ENUM3 etc (capital letters)
		list: number of items followed by the items in the list separated by spaces
	<- end configuration format ->
	`;

export function calcChatPrompt(calcs: SepticCalcInfo[]): vscode.LanguageModelChatMessage {
	let description: string = `
	Septic configuration supports execution of calculations. Calculations are defined in the configuration file as follows: Alg= "..."

	The content of the string is executed by the MPC. The algorithm is written in a simple language that supports basic arithmetic operations, variables, and functions. The following rules apply:
	- Supported operators: +, -, *, /, %
	- Grouping with parentheses: (...)
	- Variables: Refers to objects in the configuration file. It is allowed with jinja expressions in variable names, but not only jinja. Example: {{ Jinja }}VariableName
	- All non-zero values are considered true
	- All functions returns a float
	- Arguments are separated by commas
	- Insensitive to whitespace
	- The following functions are available with descriptions afterwards:
	`

	let functions: string[] = calcs.map((calc) => `\t - ${calc.signature}: ${calc.detailedDescription}`);
	return vscode.LanguageModelChatMessage.User([septicPrePrompt, description, ...functions].join('\n'));
} 
