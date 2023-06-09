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
import { SepticCnfg } from "./septicCnfg";
import { SepticToken, SepticTokenType } from "./septicTokens";
import {
    Attribute,
    AttributeValue,
    Identifier,
    SepticComment,
    SepticObject,
} from "./septicElements";

export function parseSeptic(
    input: string,
    token: CancellationToken | undefined = undefined
): SepticCnfg {
    const tokens = tokenize(input, token);
    if (!tokens.tokens.length) {
        return new SepticCnfg([]);
    }
    const parser = new SepticParser(tokens.tokens);

    let cnfg = parser.parse(token);
    cnfg.comments = tokens.comments.map((comment) => {
        return new SepticComment(comment.content, comment.start, comment.end);
    });
    return cnfg;
}

let validAttributeTokens = [
    SepticTokenType.numeric,
    SepticTokenType.string,
    SepticTokenType.identifier,
];

export class SepticParser extends Parser<SepticTokenType, SepticCnfg> {
    public errors: ParserError<SepticTokenType>[] = [];

    parse(token: CancellationToken | undefined = undefined): SepticCnfg {
        let septicObjects = [];
        while (!this.isAtEnd()) {
            if (token?.isCancellationRequested) {
                return new SepticCnfg([]);
            }
            if (this.match(SepticTokenType.object)) {
                let septicObj = this.septicObject();
                septicObjects.push(septicObj);
            } else {
                this.synchronize(
                    "Unexpected token. Expected septic object",
                    SepticTokenType.object
                );
            }
        }
        return new SepticCnfg(septicObjects);
    }

    septicObject(): SepticObject {
        let token: SepticToken = this.previous();
        this.synchronize(
            "Unexpected token. Expected idenifier token",
            SepticTokenType.identifier,
            SepticTokenType.attribute,
            SepticTokenType.object
        );
        let identifier;
        if (this.match(SepticTokenType.identifier)) {
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
            SepticTokenType.attribute,
            SepticTokenType.object
        );

        while (this.match(SepticTokenType.attribute)) {
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
                SepticTokenType.attribute,
                SepticTokenType.object,
                ...validAttributeTokens
            );
            if (
                this.check(SepticTokenType.attribute) ||
                this.check(SepticTokenType.object)
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

/* Order in list matter. Most specialized should come first.
    Attribute and Object needs to come before Identifier.
    Unknown should always come last. 
*/
const REGEX_LIST = [
    { type: SepticTokenType.lineComment, regex: LINE_COMMENT_REGEX },
    { type: SepticTokenType.blockComment, regex: BLOCK_COMMENT_REGEX },
    { type: SepticTokenType.jinjaComment, regex: JINJA_COMMENT_REGEX },
    { type: SepticTokenType.jinjaExpression, regex: JINJA_EXPRESSION_REGEX },
    { type: SepticTokenType.attribute, regex: ATTRIBUTE_REGEX },
    { type: SepticTokenType.object, regex: OBJECT_REGEX },
    { type: SepticTokenType.string, regex: STRING_REGEX },
    { type: SepticTokenType.numeric, regex: NUMERIC_REGEX },
    { type: SepticTokenType.identifier, regex: IDENTIFIER_REGEX },
    { type: SepticTokenType.skip, regex: SKIP_REGEX },
    { type: SepticTokenType.unknown, regex: UNKNOWN_REGEX },
];

interface ITokenize {
    tokens: IToken<SepticTokenType>[];
    comments: IToken<SepticTokenType>[];
}

export function tokenize(
    input: string,
    token: CancellationToken | undefined = undefined
): ITokenize {
    let commentTokens: IToken<SepticTokenType>[] = [];
    let tokens: IToken<SepticTokenType>[] = [];
    let curpos: number = 0;
    while (curpos < input.length) {
        if (token?.isCancellationRequested) {
            return { tokens: [], comments: [] };
        }
        let temp = input.slice(curpos);
        for (let i = 0; i < REGEX_LIST.length; i++) {
            let element = REGEX_LIST[i];
            let match = temp.match(element.regex);
            if (!match) {
                continue;
            }
            let lengthMatch = match[0].length;
            if (element.type === SepticTokenType.skip) {
                curpos += lengthMatch;
                break;
            }

            if (
                element.type === SepticTokenType.lineComment ||
                element.type === SepticTokenType.blockComment ||
                element.type === SepticTokenType.jinjaComment ||
                element.type === SepticTokenType.jinjaExpression
            ) {
                commentTokens.push({
                    type: element.type,
                    start: curpos,
                    end: curpos + lengthMatch,
                    content: match[0],
                });
                curpos += lengthMatch;
                break;
            }
            let token: IToken<SepticTokenType>;
            if (
                element.type === SepticTokenType.object ||
                element.type === SepticTokenType.attribute
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
        type: SepticTokenType.eof,
        start: curpos,
        end: curpos,
        content: "\0",
    });
    return { tokens: tokens, comments: commentTokens };
}
