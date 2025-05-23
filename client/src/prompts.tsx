/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BasePromptElementProps, PromptElement, UserMessage, TextChunk } from '@vscode/prompt-tsx';
import { SepticCalcInfo, SepticVariable } from './protocol';

export interface SepticCalcPromptProps extends BasePromptElementProps {
	calcs: SepticCalcInfo[];
	variables: SepticVariable[] | undefined;
}

export class SepticGenerateCalcPrompt extends PromptElement<SepticCalcPromptProps> {
	async render() {
		return (
			<>
				<UserMessage>You are an expert on the Septic advanced process control software and creating calculations that follows the given set of rules for calculations. You follow the instructions of the user carefully and always check your work towards the given rules and iterate through multiple solutions to find the best one.</UserMessage>
				<SepticCalcPrompt calcs={this.props.calcs} variables={this.props.variables} />
				<UserMessage priority={10}>
					Format the calculation as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is examples of what your response should look like <br />
					{'{ "calculation":  "setfulf(if(Zpc > 10, 10, 1)" }'} {'{ "calculation":  "max(1, Zpc - Zpc.Low, Pdh)" }'} <br />
					Please create a calculation that meets the requirements of the user that only uses the available variables and functions. <br />
				</UserMessage>
			</>
		)
	}
}

export class SepticCalcPrompt extends PromptElement<SepticCalcPromptProps> {
	override async prepare(): Promise<void> {
	}
	async render() {
		const calcElements = [];
		for (let i = 0; i < this.props.calcs.length; i++) {
			calcElements.push(<CalcFunctions calc={this.props.calcs[i]} />);
		}
		return (
			<>
				<CalcInformation calcs={this.props.calcs} priority={20} />
				<SepticVariables variables={this.props.variables} priority={100} />

			</>
		)
	}

}

export interface CalcInformationProps extends BasePromptElementProps {
	calcs: SepticCalcInfo[]
}

export class CalcInformation extends PromptElement<CalcInformationProps> {
	override async prepare(): Promise<void> {
	}
	async render() {
		const calcElements = [];
		for (let i = 0; i < this.props.calcs.length; i++) {
			calcElements.push(<CalcFunctions calc={this.props.calcs[i]} />);
		}
		return (
			<>
				<UserMessage>
					Septic configuration supports execution of calculations. Calculations are defined in the configuration file as follows: Alg= "..." <br />
					The content of the string is executed by the MPC. The calculation is written in a simple language that supports basic arithmetic operations, variables, and functions. The following rules apply and most be strictly followed: <br />
					%%% start rules %%% <br />
					- Supported operators: +, -, *, /, % <br />
					- Supported comparison operators: ==, {'>'}, {'>='}, {'<='}, {'<'} <br />
					- Supported logical functions: and(condition1, condition2, ..., conditionN), or(condition1, condition2, ..., conditionN), not(condition) <br />
					- Grouping with parentheses: (...) <br />
					- Variables: Refers to objects in the configuration file. It is allowed with jinja expressions in variable names, but not only jinja. Example: {`{{ Jinja }}`}VariableName <br />
					- All non-zero values are considered true <br />
					- All functions returns a float <br />
					- Arguments to function are separated by commas <br />
					- Calculations are insensitive to whitespace <br />
					- The if function is written as follows: if(condition, true_value, false_value) both true_value and false_value are evaluated, but only the correct one is returned, thus functions that sets values must not be used within the if function and instead get the result of the if function as input. <br />
					%%% end rules %%% <br />
					The only allowed functions are listed with descriptions below: <br />
					%%% start list of functions %%% <br />
					{calcElements}
					%%% end list of functions %%% <br />
					Examples of correct calculations: <br />
					Alg= "setmeas(Var1, if(Var2 {'>'} Var1, Var2, Var3))" <br />
					Alg= "setmode(Var1, if(getmode(Var1) {'>'} 3, 3, 0),1)" <br />
					Alg= "and(Var2 {'>'} Var1, Var3 == 1)" <br />
					Alg= "or(Var2 {'>'} Var1, Var3 == 1)" <br />
					Examples of incorrect calculations: <br />
					Alg= "if(Var2 {'>'} Var1, setmeas(Var1, Var2), Var3)" <br />
					Alg= "if(getmode(Var1) {'>'} 3, setmode(Var1, 3), setmode(Var1, 1))" <br />
					Alg= "Var2 {'>'} Var1 and Var3 == 1" <br />
					Alg= "Var2 {'>'} Var1 or Var3 == 1" <br />
				</UserMessage>
			</>
		)
	}
}


export interface CalcFunctionProps extends BasePromptElementProps {
	calc: SepticCalcInfo
}


export class CalcFunctions extends PromptElement<CalcFunctionProps> {
	override async prepare(): Promise<void> {
	}
	async render() {
		let description = this.props.calc.detailedDescription;
		if (description.length > 50) {
			description = description.slice(0, 50) + "...";
		}
		description = description.replace((/(\r\n|\n|\r|<br>)/gm), "");
		return (
			<>
				{this.props.calc.signature}: {description} <br />
			</>
		)
	}
}
export interface SepticVariablesProps extends BasePromptElementProps {
	variables: SepticVariable[] | undefined
}

export class SepticVariables extends PromptElement<SepticVariablesProps> {
	render() {
		let variableElements: string = ""
		if (this.props.variables) {
			variableElements = this.props.variables.map((variable) => {
				return variable.name + ";" + variable.type + ";" + variable.description;
			}).join("\n");
		}
		return (
			<>
				<UserMessage>
					Variables can be referenced in calculations. Only the name of the variable is used in the calculation.
					You have access to the following variables. The following structure is used: Name;Type;Description  <br />
					%%% start list of variables %%% <br />
					<TextChunk breakOn='\n'>{variableElements}</TextChunk><br />
					%%% end list of variables %%% <br />
				</UserMessage>
			</>
		)
	}
}


export class SepticInformation extends PromptElement<object> {
	override async prepare(): Promise<void> {
	}
	async render() {
		return (
			<>
				<UserMessage>
					You are an expert on the Septic advanced process control software. Septic is a MPC that support custom applications. The custom application is described in a configuration file that have the following format: <br />
					%%%start configuration format%%% <br />
					An object is defined as follows: <br />
					ObjectType:  ObjectName <br />
					Attribute1= Value1 <br />
					Attribute2= Value2	<br />
					...	<br />
					AttributeN= ValueN <br />

					Attributes: have different names and values. <br />
					Available attribute values are: <br />
					string: "..." <br />
					int: 1, 2, 3 etc <br />
					float: 1.0, 2.0, 3.0 etc (with a decimal point) and scientific notation 1e-3, 2e-3, 3e-3 etc <br />
					bitmask: 0000000000000000000000000000001 (32 bits), 0001 (4 bits) etc <br />
					enums: ENUM1, ENUM2, ENUM3 etc (capital letters) <br />
					list: number of items followed by the items in the list separated by spaces <br />
					%%%end configuration format%%% <br />
				</UserMessage>
			</>
		)
	}
}