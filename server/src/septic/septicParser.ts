/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode-languageserver";
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
    SepticTokenType.path,
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
        this.tokens.push({
            type: SepticTokenType.eof,
            content: "\0",
            start: this.current,
            end: this.current,
        });
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
                if (this.isLineComment()) {
                    this.lineComment();
                } else if (this.isBlockComment()) {
                    this.blockComment();
                } else {
                    this.path();
                }
                break;
            case "-":
            case "+":
                if (this.isDigit(this.peek())) {
                    this.numeric();
                } else {
                    this.error(`Unexpected token: ${c}`);
                }
                break;
            case "~":
                this.path();
                break;
            default:
                if (this.isDigit(c)) {
                    this.numeric();
                } else if (this.isAlpha(c)) {
                    this.identifier();
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

    private previous(): string {
        if (this.current === 0) {
            return "\0";
        }
        return this.source.charAt(this.current - 1);
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

    private peekNextNext(): string {
        if (this.current + 2 >= this.source.length) {
            return "\0";
        }
        return this.source.charAt(this.current + 2);
    }

    private error(msg: string): void {
        this.errors.push(msg);
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

    private isBlockComment() {
        return this.peek() === "*";
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

    private isLineComment() {
        return this.peek() === "/";
    }

    private lineComment() {
        while (
            !this.isAtEnd() &&
            this.peek() !== "\n" &&
            this.peek() !== "\r"
        ) {
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

    private numeric() {
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        if (this.isAlpha(this.peek())) {
            if (this.peek() !== "e" && this.peek() !== "E") {
                return this.identifier();
            }
            if (
                !this.isDigit(this.peekNext()) &&
                !(
                    (this.peekNext() === "-" || this.peekNext() === "+") &&
                    this.isDigit(this.peekNextNext())
                )
            ) {
                return this.identifier();
            }
        }
        if (this.peek() === "." && this.isDigit(this.peekNext())) {
            this.advance();
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        // Support numbers using scientific notation
        if (this.peek() === "e" || this.peek() === "E") {
            if (
                this.isDigit(this.peekNext()) ||
                ((this.peekNext() === "-" || this.peekNext() === "+") &&
                    this.isDigit(this.peekNextNext()))
            ) {
                this.advance();
                if (!this.isDigit(this.peek())) {
                    this.advance();
                }
                while (this.isDigit(this.peek())) {
                    this.advance();
                }
                if (this.peek() === "." && this.isDigit(this.peekNext())) {
                    this.advance();
                    while (this.isDigit(this.peek())) {
                        this.advance();
                    }
                }
            }
        }
        this.addToken(SepticTokenType.numeric);
    }

    private identifier() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
            if (this.peek() === ":") {
                if (!this.isBlank(this.peekNext())) {
                    this.error("Expecting space at end of object declaration");
                    break;
                }
                this.addToken(SepticTokenType.object);
                this.advance();
                return;
            }
            if (this.peek() === "=") {
                if (!this.isBlank(this.peekNext())) {
                    this.error(
                        "Expecting space at end of attribute declaration"
                    );
                    break;
                }
                this.addToken(SepticTokenType.attribute);
                this.advance();
                return;
            }
        }
        this.addToken(SepticTokenType.identifier);
    }

    private jinja(type: string): void {
        while (!this.isAtEnd() && !this.match(type)) {
            this.advance();
        }
        if (!this.match("}")) {
            this.error("Invalid jinja expression");
            return;
        }
        if (type === "%") {
            this.addComment(SepticTokenType.jinjaExpression);
        } else if (type === "#") {
            this.addComment(SepticTokenType.jinjaComment);
        } else {
            this.addToken(SepticTokenType.identifier);
        }
    }

    private path(): void {
        while (
            !this.isAtEnd() &&
            !(
                this.peek() === " " ||
                this.peek() === "\n" ||
                this.peek() === "\r"
            )
        ) {
            this.advance();
        }
        this.addToken(SepticTokenType.path);
    }

    private isDigit(char: string): boolean {
        return char >= "0" && char <= "9";
    }

    private isAlpha(char: string): boolean {
        return (
            (char >= "a" && char <= "z") ||
            (char >= "A" && char <= "Z") ||
            char === "_" ||
            char === "*" ||
            char === "-"
        );
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private isBlank(char: string): boolean {
        return [" ", "\n", "\r", "\t"].includes(char);
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
}
