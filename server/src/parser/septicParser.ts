import { CancellationToken } from "vscode-languageserver";
import { Parser, IToken, ParserError } from "./parser";
import {
	ATTRIBUTE_REGEX,
	BLOCK_COMMENT_REGEX,
	IDENTIFIER_REGEX,
	JINJA_COMMENT_REGEX,
	LINE_COMMENT_REGEX,
	NUMERIC_REGEX,
	OBJECT_REGEX,
	SKIP_REGEX,
	STRING_REGEX,
	UNKNOWN_REGEX,
} from "./regex";

export function parseSeptic(
	input: string,
	token: CancellationToken | undefined = undefined
): SepticCnfg {
	const tokens = tokenize(input, token);
	const parser = new SepticParser(tokens);
	return parser.parse(token);
}

export enum SepticTokenType {
	Object,
	Attribute,
	BlockComment,
	LineComment,
	JinjaComment,
	Numeric,
	String,
	Skip,
	Unknown,
	Identifier,
	EOF = "eof",
}

type SepticToken = IToken<SepticTokenType>;

let validAttributeTokens = [
	SepticTokenType.Numeric,
	SepticTokenType.String,
	SepticTokenType.Identifier,
];

export class SepticParser extends Parser<SepticTokenType, SepticCnfg> {
	public errors: ParserError<SepticTokenType>[] = [];

	parse(token: CancellationToken | undefined = undefined): SepticCnfg {
		let septicObjects = [];
		while (!this.isAtEnd()) {
			if (token?.isCancellationRequested) {
				return new SepticCnfg([]);
			}
			if (this.match(SepticTokenType.Object)) {
				let septicObj = this.septicObject();
				septicObjects.push(septicObj);
			} else {
				this.synchronize(
					"Unexpected token. Expected septic object",
					SepticTokenType.Object
				);
			}
		}
		return new SepticCnfg(septicObjects);
	}

	septicObject(): SepticObject {
		let token: SepticToken = this.previous();
		this.synchronize(
			"Unexpected token. Expected variable token",
			SepticTokenType.Identifier,
			SepticTokenType.Attribute,
			SepticTokenType.Object
		);
		let variable;
		if (this.match(SepticTokenType.Identifier)) {
			variable = this.variable();
		} else {
			this.error(
				"Expected variable type token after object declaration",
				token
			);
			variable = undefined;
		}

		let septicObject: SepticObject = new SepticObject(
			token.content,
			variable,
			token.start,
			token.end
		);

		this.synchronize(
			"Unexpected token! Expected attribute or object types",
			SepticTokenType.Attribute,
			SepticTokenType.Object
		);

		while (this.match(SepticTokenType.Attribute)) {
			let attr = this.attribute();
			septicObject.addAttribute(attr);
		}
		septicObject.updateEnd();
		return septicObject;
	}

	attribute(): Attribute {
		let token: SepticToken = this.previous();
		let attr = new Attribute(token.content, token.start, token.end);
		while (!this.isAtEnd()) {
			if (this.match(...validAttributeTokens)) {
				let value = this.attributeValue();
				attr.addValue(value);
				continue;
			}
			this.synchronize(
				"Unexpected token during parsing of value",
				SepticTokenType.Attribute,
				SepticTokenType.Object,
				...validAttributeTokens
			);
			if (
				this.check(SepticTokenType.Attribute) ||
				this.check(SepticTokenType.Object)
			) {
				break;
			}
		}

		attr.updateEnd();
		return attr;
	}

	variable(): Variable {
		let token = super.previous();
		let variable = new Variable(token.content, token.start, token.end);
		return variable;
	}

	attributeValue(): AttributeValue {
		let token = this.previous();
		return new AttributeValue(
			token.content,
			token.type,
			token.start,
			token.end
		);
	}

	error(message: string, token: IToken<SepticTokenType>): void {
		this.errors.push(new ParserError<SepticTokenType>(message, token));
	}
}

export class SepticCnfg {
	objects: SepticObject[];

	constructor(objects: SepticObject[]) {
		this.objects = objects;
	}
}

export class SepticBase {
	start: number;
	end: number;

	constructor(start: number = -1, end: number = -1) {
		this.start = start;
		this.end = end;
	}

	updateEnd(): void {
		return;
	}
}

export class SepticObject extends SepticBase {
	name: string;
	variable: Variable | undefined;
	attributes: Attribute[];

	constructor(
		name: string,
		variable: Variable | undefined,
		start: number = -1,
		end: number = -1
	) {
		super(start, end);
		this.name = name;
		this.variable = variable;
		this.attributes = [];
	}

	addAttribute(attr: Attribute) {
		this.attributes.push(attr);
	}

	updateEnd(): void {
		this.variable?.updateEnd();
		this.attributes.forEach((elem) => {
			elem.updateEnd();
		});
		if (this.attributes.length >= 1) {
			this.end = this.attributes[this.attributes.length - 1].end;
		}
	}
}

export class Attribute extends SepticBase {
	values: AttributeValue[];
	name: string;

	constructor(name: string, start: number = -1, end: number = -1) {
		super(start, end);
		this.values = [];
		this.name = name;
	}

	addValue(value: AttributeValue) {
		this.values.push(value);
	}
	updateEnd(): void {
		if (this.values.length >= 1) {
			this.end = this.values[this.values.length - 1].end;
		}
	}
}

export class Variable extends SepticBase {
	name: string;

	constructor(name: string, start: number = -1, end: number = -1) {
		super(start, end);
		this.name = name;
	}
}

export class AttributeValue extends SepticBase {
	value: string;
	type: SepticTokenType;

	constructor(
		value: string,
		type: SepticTokenType,
		start: number = -1,
		end: number = -1
	) {
		super(start, end);
		this.value = value;
		this.type = type;
	}
}

/* Order in list matter. Most specialized should come first.
    Attribute and Object needs to come before Identifier.
    Unknown should always come last. 
*/
const REGEX_LIST = [
	{ type: SepticTokenType.LineComment, regex: LINE_COMMENT_REGEX },
	{ type: SepticTokenType.BlockComment, regex: BLOCK_COMMENT_REGEX },
	{ type: SepticTokenType.JinjaComment, regex: JINJA_COMMENT_REGEX },
	{ type: SepticTokenType.Attribute, regex: ATTRIBUTE_REGEX },
	{ type: SepticTokenType.Object, regex: OBJECT_REGEX },
	{ type: SepticTokenType.String, regex: STRING_REGEX },
	{ type: SepticTokenType.Numeric, regex: NUMERIC_REGEX },
	{ type: SepticTokenType.Identifier, regex: IDENTIFIER_REGEX },
	{ type: SepticTokenType.Skip, regex: SKIP_REGEX },
	{ type: SepticTokenType.Unknown, regex: UNKNOWN_REGEX },
];

export function tokenize(
	input: string,
	token: CancellationToken | undefined = undefined
): IToken<SepticTokenType>[] {
	let tokens: IToken<SepticTokenType>[] = [];
	let curpos: number = 0;
	while (curpos < input.length) {
		if (token?.isCancellationRequested) {
			return [];
		}
		let temp = input.slice(curpos);
		for (let i = 0; i < REGEX_LIST.length; i++) {
			let element = REGEX_LIST[i];
			let match = temp.match(element.regex);
			if (!match) {
				continue;
			}
			let lengthMatch = match[0].length;
			if (
				element.type === SepticTokenType.Skip ||
				element.type === SepticTokenType.LineComment ||
				element.type === SepticTokenType.BlockComment ||
				element.type === SepticTokenType.JinjaComment
			) {
				curpos += lengthMatch;
				break;
			}
			let token: IToken<SepticTokenType>;
			if (
				element.type === SepticTokenType.Object ||
				element.type === SepticTokenType.Attribute
			) {
				token = {
					type: element.type,
					start: curpos,
					end: curpos + lengthMatch,
					content: match[1],
				};
			} else {
				token = {
					type: element.type,
					start: curpos,
					end: curpos + lengthMatch,
					content: match[0],
				};
			}
			tokens.push(token);
			curpos += lengthMatch;
			break;
		}
	}
	tokens.push({
		type: SepticTokenType.EOF,
		start: curpos,
		end: curpos,
		content: "\0",
	});
	return tokens;
}
