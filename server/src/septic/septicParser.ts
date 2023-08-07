/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, Trace } from "vscode-languageserver";
import { Parser, IToken, ParserError } from "./parser";
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
    const scanner = new SepticScanner(input);
    const tokens = scanner.scanTokens();
    if (!tokens.tokens.length) {
        return new SepticCnfg([]);
    }
    const parser = new SepticParser(tokens.tokens);

    let cnfg = parser.parse(token);
    cnfg.comments = tokens.comments.map((comment) => {
        return new SepticComment(
            comment.content,
            comment.type,
            comment.start,
            comment.end
        );
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
            SepticTokenType.numeric,
            SepticTokenType.attribute,
            SepticTokenType.object
        );
        let identifier;
        if (this.match(SepticTokenType.identifier, SepticTokenType.numeric)) {
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

interface ITokenize {
    tokens: IToken<SepticTokenType>[];
    comments: IToken<SepticTokenType>[];
}

export class SepticScanner {
    private readonly source: string;
    private tokens: SepticToken[] = [];
    private comments: SepticToken[] = [];
    private start: number = 0;
    private current: number = 0;
    private errors: string[] = [];

    constructor(source: string) {
        this.source = source;
    }

    public scanTokens(): ITokenize {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }
        this.addToken(SepticTokenType.eof);
        return {
            tokens: this.concatIdentifiers(this.tokens),
            comments: this.comments,
        };
    }

    private isAtEnd() {
        return this.current >= this.source.length;
    }

    private scanToken(): void {
        let c = this.advance();
        switch (c) {
            case " ":
            case "\r":
            case "\n":
            case "\t":
                break;
            case "{":
                let next = this.advance();
                if (next === "{") {
                    this.jinja("}");
                } else if (next === "#" || next === "%") {
                    this.jinja(next);
                } else {
                    this.error(`Unexpected token: ${next}`);
                }
                break;
            case `"`:
                this.string();
                break;
            case "/":
                if (this.peek() === "/") {
                    this.lineComment();
                } else if (this.peek() === "*") {
                    this.blockComment();
                } else {
                    this.error(`Unexpected token: ${this.peek()}`);
                }
                break;
            default:
                if (this.isAlphaNumeric(c)) {
                    this.alphaNumeric();
                } else {
                    this.addToken(SepticTokenType.unknown);
                    this.error(`Unexpected token: ${c}`);
                }
        }
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        if (this.source.charAt(this.current) !== expected) {
            return false;
        }
        this.current += 1;
        return true;
    }

    private advance(): string {
        return this.source.charAt(this.current++);
    }

    private peek(): string {
        if (this.isAtEnd()) {
            return "\0";
        }
        return this.source.charAt(this.current);
    }

    private peekNext(): string {
        if (this.current + 1 >= this.source.length) {
            return "\0";
        }
        return this.source.charAt(this.current + 1);
    }

    private addToken(type: SepticTokenType): void {
        this.tokens.push({
            type: type,
            content: this.source.substring(this.start, this.current),
            start: this.start,
            end: this.current,
        });
    }

    private addComment(type: SepticTokenType): void {
        this.comments.push({
            type: type,
            content: this.source.substring(this.start, this.current),
            start: this.start,
            end: this.current,
        });
    }

    private blockComment() {
        while (!this.isAtEnd() && !this.isEndOfBlockComment()) {
            this.advance();
        }
        if (!this.isAtEnd()) {
            this.advance();
            this.advance();
        }
        this.addComment(SepticTokenType.blockComment);
    }

    private isEndOfBlockComment() {
        return this.peek() === "*" && this.peekNext() === "/";
    }

    private lineComment() {
        while (!this.isAtEnd() && !this.match("\n") && !this.match("\r")) {
            this.advance();
        }
        this.addComment(SepticTokenType.lineComment);
    }

    private string() {
        while (!this.isAtEnd() && !this.match(`"`)) {
            this.advance();
        }
        this.addToken(SepticTokenType.string);
    }

    private alphaNumeric() {
        let isNumericFlag = true;
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
            if (!this.isNumeric(this.peek())) {
                isNumericFlag = false;
            }
            this.advance();
            if (this.peek() === ":") {
                if (this.peekNext() !== " ") {
                    this.error("Expecting space at end of object declaration");
                }
                this.addToken(SepticTokenType.object);
                this.advance();
                return;
            }
            if (this.peek() === "=") {
                if (this.peekNext() !== " ") {
                    this.error(
                        "Expecting space at end of attribute declaration"
                    );
                }
                this.addToken(SepticTokenType.attribute);
                this.advance();
                return;
            }
        }
        if (isNumericFlag && (this.isBlank(this.peek()) || this.isAtEnd())) {
            this.addToken(SepticTokenType.numeric);
        } else {
            this.addToken(SepticTokenType.identifier);
        }
    }

    private isNumeric(char: string): boolean {
        const validNumericChars = ["+", "-", "e", "E", "."];
        if ((char >= "0" && char <= "9") || validNumericChars.includes(char)) {
            return true;
        }
        return false;
    }

    private isAlpha(char: string): boolean {
        return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
    }

    private isAlphaNumeric(char: string): boolean {
        const validIdentifierChars = ["-", "_", "*"];
        return (
            this.isAlpha(char) ||
            this.isNumeric(char) ||
            validIdentifierChars.includes(char)
        );
    }

    private isBlank(char: string) {
        return [" ", "\n", "\r"].includes(char);
    }

    private jinja(type: string): void {
        while (!this.isAtEnd() && !this.match(type)) {
            this.advance();
        }
        if (!this.match("}")) {
            this.error("Invalid jinja expression");
        }
        if (type === "%") {
            this.addComment(SepticTokenType.jinjaExpression);
        } else if (type === "#") {
            this.addComment(SepticTokenType.jinjaComment);
        } else {
            this.addToken(SepticTokenType.identifier);
        }
    }

    private concatIdentifiers(tokens: SepticToken[]): SepticToken[] {
        const updatedTokens: SepticToken[] = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type !== SepticTokenType.identifier) {
                updatedTokens.push(tokens[i]);
                continue;
            }
            let identifierToken = tokens[i];
            let j = i + 1;
            let nextToken = j < tokens.length ? tokens[j] : undefined;
            while (nextToken) {
                if (
                    nextToken.type === SepticTokenType.identifier &&
                    nextToken.start === identifierToken.end
                ) {
                    identifierToken.end = nextToken.end;
                    identifierToken.content += nextToken.content;
                    j += 1;
                    nextToken = j < tokens.length ? tokens[j] : undefined;
                } else {
                    break;
                }
            }
            updatedTokens.push(identifierToken);
            i = j - 1;
        }
        return updatedTokens;
    }
    private error(msg: string): void {
        this.errors.push(msg);
    }
}
