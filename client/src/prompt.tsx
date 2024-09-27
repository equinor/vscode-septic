import { BasePromptElementProps, PromptElement, PromptSizing, AssistantMessage, UserMessage } from '@vscode/prompt-tsx';
import { SepticCalcInfo } from './protocol';

export interface SepticCalcPromptProps extends BasePromptElementProps {
	userQuery: string;
	calcs: SepticCalcInfo[]
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
				<SepticInformation />
				<CalcInformation calcs={this.props.calcs} />
				<AssistantMessage>
					The output when suggesting an calculation should be on the following format: <br />
					CalcPvr: %variable name% <br />
					Text1= "%describe calculation%" <br />
					Text2= "" <br />
					Alg= "%algorithm%" <br />
				</AssistantMessage>
				<UserMessage>
					Here is a description of the calculations that the user wants you to create: <br />
					{this.props.userQuery}
				</UserMessage>
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
				<AssistantMessage>
					Septic configuration supports execution of calculations. Calculations are defined in the configuration file as follows: Alg= "..." <br />
					The content of the string is executed by the MPC. The algorithm is written in a simple language that supports basic arithmetic operations, variables, and functions. The following rules apply: <br />
					- Supported operators: +, -, *, /, % <br />
					- Grouping with parentheses: (...) <br />
					- Variables: Refers to objects in the configuration file. It is allowed with jinja expressions in variable names, but not only jinja. Example: {`{{ Jinja }}`}VariableName <br />
					- All non-zero values are considered true <br />
					- All functions returns a float <br />
					- Arguments are separated by commas <br />
					- The if function is written as follows: if(condition, true_value, false_value) both true_value and false_value are evaluated, but only the correct one is returned, thus functions that sets values should not be used within the if function and instaed be used before the if function get the result as an argurment. <br />
					- Correct usage: setmeas(Variable1, if(Variable2 {'>'} 0, 1, 0)) <br />
					- Incorrect usage: if(Variable2 {'>'} 0, setmeas(Variable1, 1), setmeas(Variable1, 0)) <br />
					- Insensitive to whitespace <br />
					- The only allowed functions are listed with descriptions below: <br />
				</AssistantMessage>
				<AssistantMessage>
					{calcElements}
				</AssistantMessage>
				<AssistantMessage>
					The output when suggesting an algorithm should be on the following format: <br />
					CalcPvr: %variable name% <br />
					Text1= "%description%" <br />
					Text2= "" <br />
					Alg= "%algorithm%" <br />
				</AssistantMessage>
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
		return (
			<>
				<AssistantMessage>
					{this.props.calc.signature}: {this.props.calc.detailedDescription.replace("\n", " ")} <br />
				</AssistantMessage>
			</>
		)
	}
}

export class SepticInformation extends PromptElement<{}> {
	override async prepare(): Promise<void> {
	}
	async render() {
		return (
			<>
				<AssistantMessage>
					You are an expert on the Septic advanced process control software. Septic is a MPC that support custom applications. The custom application is described in a configuration file that have the following format: <br />
					%start configuration format% <br />
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
					%end configuration format% <br />
				</AssistantMessage>
			</>
		)
	}
}