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
	- The if function is written as follows: if(condition, true_value, false_value) both true_value and false_value are evaluated, but only the correct one is returned, thus functions that sets values should not be used within the if function and instaed be used before the if function get the result as an argurment.
		- Correct usaage: setmeas(Variable1, if(Variable2 > 0, 1, 0))
		- Incorrect usage: if(Variable2 > 0, setmeas(Variable1, 1), setmeas(Variable1, 0))
	- Insensitive to whitespace
	- The only allowed functions are listed with descriptions below:
	`
	let output: string = `The output when suggesting an algorithm should be on the following format:
		CalcPvr: <variable name>
		   Text1= ""
		   Text2= ""
		     Alg= "<algorithm>"
	
	`
	let functions: string[] = calcs.map((calc) => `\t - ${calc.signature}: ${calc.detailedDescription}`);
	return vscode.LanguageModelChatMessage.Assistant([septicPrePrompt, description, ...functions, output].join('\n'));
} 
