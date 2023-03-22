/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode-languageserver";
import { Parser, IToken, ParserError } from "./parser";
import {
    ATTRIBUTE_REGEX,
    BLOCK_COMMENT_REGEX,
    IDENTIFIER_REGEX,
    JINJA_COMMENT_REGEX,
    JINJA_EXPRESSION_REGEX,
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
    JinjaExpression,
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
            "Unexpected token. Expected idenifier token",
            SepticTokenType.Identifier,
            SepticTokenType.Attribute,
            SepticTokenType.Object
        );
        let identifier;
        if (this.match(SepticTokenType.Identifier)) {
            identifier = this.identifier();
        } else {
            this.error(
                "Expected identifier type token after object declaration",
                token
            );
            identifier = undefined;
        }

        let septicObject: SepticObject = new SepticObject(
            token.content,
            identifier,
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

    identifier(): Identifier {
        let token = super.previous();
        let identifier = new Identifier(token.content, token.start, token.end);
        return identifier;
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
    public objects: SepticObject[];
    readonly xvrs = new Map<string, SepticObject[]>();
    private xvrsExtracted = false;

    constructor(objects: SepticObject[]) {
        this.objects = objects;
    }

    public getAlgAttr(): Attribute[] {
        const objects: Attribute[] = [];
        this.objects.forEach((obj) => {
            if (obj.type === "CalcPvr") {
                let algAttr = obj.attributes.find((el) => {
                    return el.key === "Alg";
                });
                if (algAttr) {
                    objects.push(algAttr);
                }
            }
        });
        return objects;
    }

    public getXvr(name: string): SepticObject[] | undefined {
        this.extractXvrs();
        return this.xvrs.get(name);
    }

    public getAllXvrs(): SepticObject[] {
        this.extractXvrs();
        const xvrs: SepticObject[] = [];
        this.xvrs.forEach((xvr) => {
            xvrs.push(...xvr);
        });
        return xvrs;
    }

    public offsetInAlg(offset: number): boolean {
        const algAttr = this.getAlgAttr();
        for (let alg of algAttr) {
            if (!alg.values.length) {
                continue;
            }
            let algValue = alg.values[0];
            if (offset >= algValue.start && offset <= algValue.end) {
                return true;
            }
        }
        return false;
    }

    public getObjectFromOffset(offset: number): SepticObject | undefined {
        return this.objects.find((obj) => {
            return offset >= obj.start && offset <= obj.end;
        });
    }

    private extractXvrs(): void {
        if (this.xvrsExtracted) {
            return;
        }
        this.xvrsExtracted = true;

        const regexVariable = /[a-zA-Z]+vr/;
        this.objects.forEach((obj) => {
            if (regexVariable.test(obj.type)) {
                if (obj.identifier) {
                    if (this.xvrs.has(obj.identifier.name)) {
                        this.xvrs.get(obj.identifier.name)?.push(obj);
                    } else {
                        this.xvrs.set(obj.identifier!.name, [obj]);
                    }
                }
            }
        });
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
    type: string;
    identifier: Identifier | undefined;
    attributes: Attribute[];

    constructor(
        type: string,
        identifier: Identifier | undefined,
        start: number = -1,
        end: number = -1
    ) {
        super(start, end);
        this.type = type;
        this.identifier = identifier;
        this.attributes = [];
    }

    addAttribute(attr: Attribute) {
        this.attributes.push(attr);
    }

    updateEnd(): void {
        this.identifier?.updateEnd();
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
    key: string;

    constructor(key: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.values = [];
        this.key = key;
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

export class Identifier extends SepticBase {
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
    { type: SepticTokenType.JinjaExpression, regex: JINJA_EXPRESSION_REGEX },
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
                element.type === SepticTokenType.JinjaComment ||
                element.type === SepticTokenType.JinjaExpression
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
