/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) 2015 Robert Nystrom [CraftingInterpreters]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode-languageserver";
import { IToken, Parser, ParserError } from "./parser";

export enum AlgTokenType {
    leftParen,
    rightParen,
    comma,
    dot,
    minus,
    plus,
    mul,
    div,
    equal,
    equalEqual,
    less,
    lessEqual,
    greater,
    greaterEqual,
    identifier,
    jinja,
    string,
    number,
    error,
    eof = "eof",
}

export type AlgToken = IToken<AlgTokenType>;

export class AlgParsingError extends ParserError<AlgTokenType> {
    public readonly type: AlgParsingErrorType;

    constructor(
        message: string,
        token: AlgToken,
        type: AlgParsingErrorType = AlgParsingErrorType.default
    ) {
        super(message, token);
        this.type = type;
    }
}

export enum AlgParsingErrorType {
    unsupportedJinja,
    default,
}

export function parseAlg(input: string): AlgExpr {
    if (!input.length) {
        throw new AlgParsingError("Missing alg expression for CalcPvr.", {
            start: 0,
            end: 0,
            type: AlgTokenType.error,
            content: "",
        });
    }
    const scanner = new AlgScanner(input);
    const tokens = scanner.scanTokens();
    const parser = new AlgParser(tokens);
    return parser.parse();
}

export class AlgParser extends Parser<AlgTokenType, AlgExpr> {
    parse(token: CancellationToken | undefined = undefined): AlgExpr {
        let expr = this.comparison();
        if (!this.isAtEnd()) {
            this.error("Alg can only contain a single expression.", {
                start: this.tokens[0].start,
                end: this.tokens[this.tokens.length - 1].end,
                type: AlgTokenType.error,
                content: "",
            });
        }
        return expr;
    }

    private comparison(): AlgExpr {
        let expr = this.term();
        while (
            this.match(
                AlgTokenType.equalEqual,
                AlgTokenType.greater,
                AlgTokenType.greaterEqual,
                AlgTokenType.less,
                AlgTokenType.lessEqual
            )
        ) {
            let operator = this.previous();
            let right = this.term();
            expr = new AlgBinary(expr, operator, right);
        }
        return expr;
    }

    private term(): AlgExpr {
        let expr = this.factor();
        while (this.match(AlgTokenType.plus, AlgTokenType.minus)) {
            let operator = this.previous();
            let right = this.factor();
            expr = new AlgBinary(expr, operator, right);
        }
        return expr;
    }

    private factor(): AlgExpr {
        let expr = this.unary();

        while (this.match(AlgTokenType.div, AlgTokenType.mul)) {
            let operator = this.previous();
            let right = this.unary();
            expr = new AlgBinary(expr, operator, right);
        }
        return expr;
    }

    private primary(): AlgExpr {
        if (this.match(AlgTokenType.number, AlgTokenType.string)) {
            return new AlgLiteral(this.previous());
        }
        if (this.match(AlgTokenType.leftParen)) {
            let expr = this.comparison();
            this.consume(
                AlgTokenType.rightParen,
                "Missing closing paranthesis at end of grouping."
            );
            return new AlgGrouping(expr);
        }
        if (this.match(AlgTokenType.identifier)) {
            if (
                this.peek().type === AlgTokenType.leftParen &&
                this.peek().start === this.previous().end
            ) {
                return this.func();
            }
            let variable = this.variable();
            return new AlgLiteral(variable);
        }
        if (this.match(AlgTokenType.jinja)) {
            let variable = this.variable();
            return new AlgLiteral(variable);
        }
        this.error(`Unexpected token: ${this.peek().content}.`, this.peek());
    }

    private variable(): AlgToken {
        let token = this.previous();
        let content = token.content;
        let end = token.end;
        while (
            this.match(AlgTokenType.identifier, AlgTokenType.jinja) &&
            this.previous().start === end
        ) {
            content += this.previous().content;
            end = this.previous().end;
        }

        if (this.check(AlgTokenType.dot) && this.peek().start === end) {
            this.advance();
            end = this.previous().end;
            content += ".";

            if (
                !(
                    this.check(AlgTokenType.identifier) ||
                    this.check(AlgTokenType.jinja)
                )
            ) {
                this.error("Missing specifier after dot.", {
                    start: token.start,
                    end: this.previous().end,
                    content: content,
                    type: AlgTokenType.error,
                });
            }
            this.advance();
            let nextToken = this.variable();
            if (nextToken.start !== end) {
                this.error("Missing specifier after dot.", {
                    start: token.start,
                    end: this.previous().end,
                    content: content,
                    type: AlgTokenType.error,
                });
            }
            content += nextToken.content;
            end = nextToken.end;
        }

        return {
            start: token.start,
            end: end,
            content: content,
            type: AlgTokenType.identifier,
        };
    }

    private func(): AlgExpr {
        let identifierToken = this.previous();
        let args: AlgExpr[] = [];
        this.advance();
        while (
            !this.isAtEnd() &&
            this.peek().type !== AlgTokenType.rightParen
        ) {
            if (this.match(AlgTokenType.comma)) {
                if (this.check(AlgTokenType.rightParen)) {
                    this.error(
                        `Missing argument in calc: ${identifierToken.content} .`,
                        {
                            start: identifierToken.start,
                            end: this.previous().end,
                            content: "",
                            type: AlgTokenType.error,
                        }
                    );
                }
                continue;
            }
            args.push(this.comparison());
        }
        if (!this.match(AlgTokenType.rightParen)) {
            this.error(
                `Missing closing parenthesis for calc: ${identifierToken.content}`,
                {
                    start: identifierToken.start,
                    end: this.previous().end,
                    content: "",
                    type: AlgTokenType.error,
                }
            );
        }
        return new AlgFunction(identifierToken, args);
    }

    error(message: string, token: IToken<AlgTokenType>): never {
        throw new ParserError<AlgTokenType>(message, token);
    }

    private unary(): AlgExpr {
        if (this.match(AlgTokenType.minus)) {
            let operator = this.previous();
            let right = this.unary();
            return new AlgUnary(right, operator);
        }
        return this.primary();
    }
}

export abstract class AlgExpr {
    public start: number;
    public end: number;
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
    abstract accept(visitor: IAlgVisitor): any;
}

export class AlgUnary extends AlgExpr {
    public right: AlgExpr;
    public operator: AlgToken;

    constructor(right: AlgExpr, operator: AlgToken) {
        super(right.start - operator?.content.length, right.end);
        this.right = right;
        this.operator = operator;
    }

    accept(visitor: IAlgVisitor) {
        visitor.visitUnary(this);
    }
}

export class AlgBinary extends AlgExpr {
    public left: AlgExpr;
    public operator: AlgToken | undefined;
    public right: AlgExpr | undefined;

    constructor(
        left: AlgExpr,
        operator: AlgToken | undefined,
        right: AlgExpr | undefined
    ) {
        super(left.start, right?.end ?? left.end);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
    accept(visitor: IAlgVisitor): any {
        return visitor.visitBinary(this);
    }
}

export class AlgLiteral extends AlgExpr {
    public value: string;
    public type: AlgTokenType;

    constructor(token: AlgToken) {
        super(token.start, token.end);
        this.value = token.content;
        this.type = token.type;
        if (token.type === AlgTokenType.identifier) {
            this.value = this.value.replace(/\s/g, "");
        }
    }

    accept(visitor: IAlgVisitor): any {
        return visitor.visitLiteral(this);
    }
}

export class AlgFunction extends AlgExpr {
    public args: AlgExpr[];
    public identifier: string;

    constructor(identifierToken: AlgToken, args: AlgExpr[]) {
        let end;
        if (args.length) {
            end = args[args.length - 1].end + 1;
        } else {
            end = identifierToken.end + 2;
        }
        super(identifierToken.start, end);
        this.identifier = identifierToken.content;
        this.args = args;
    }
    accept(visitor: IAlgVisitor): any {
        return visitor.visitFunction(this);
    }
}

export class AlgGrouping extends AlgExpr {
    public expr: AlgExpr;

    constructor(expr: AlgExpr) {
        super(expr.start - 1, expr.end + 1);
        this.expr = expr;
    }
    accept(visitor: IAlgVisitor): any {
        return visitor.visitGrouping(this);
    }
}

export interface IAlgVisitor {
    visitBinary(expr: AlgBinary): void;
    visitLiteral(expr: AlgLiteral): void;
    visitGrouping(expr: AlgGrouping): void;
    visitFunction(expr: AlgFunction): void;
    visitUnary(expr: AlgUnary): void;
}

export class AlgVisitor implements IAlgVisitor {
    calcs: AlgFunction[] = [];
    variables: AlgLiteral[] = [];

    visit(expr: AlgExpr) {
        expr.accept(this);
    }

    visitBinary(expr: AlgBinary): void {
        expr.left.accept(this);
        expr.right?.accept(this);
    }

    visitLiteral(expr: AlgLiteral): void {
        if (expr.type === AlgTokenType.identifier) {
            this.variables.push(expr);
        }
    }

    visitGrouping(expr: AlgGrouping): void {
        expr.expr.accept(this);
    }

    visitFunction(expr: AlgFunction): void {
        this.calcs.push(expr);
        expr.args.forEach((arg) => {
            arg.accept(this);
        });
    }

    visitUnary(expr: AlgUnary): void {
        expr.right.accept(this);
    }
}

export class AlgScanner {
    private readonly source: string;
    private tokens: AlgToken[] = [];
    private start: number = 0;
    private current: number = 0;

    constructor(source: string) {
        this.source = source;
    }

    public scanTokens(): AlgToken[] {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }
        this.addToken(AlgTokenType.eof);
        return this.tokens;
    }

    private isAtEnd() {
        return this.current >= this.source.length;
    }

    private scanToken(): void {
        let c = this.advance();
        switch (c) {
            case "(":
                this.addToken(AlgTokenType.leftParen);
                break;
            case ")":
                this.addToken(AlgTokenType.rightParen);
                break;
            case "/":
                this.addToken(AlgTokenType.div);
                break;
            case "+":
                this.addToken(AlgTokenType.plus);
                break;
            case "-":
                this.addToken(AlgTokenType.minus);
                break;
            case "*":
                this.addToken(AlgTokenType.mul);
                break;
            case ".":
                this.addToken(AlgTokenType.dot);
                break;
            case ",":
                this.addToken(AlgTokenType.comma);
                break;
            case "=":
                this.addToken(
                    this.match("=")
                        ? AlgTokenType.equalEqual
                        : AlgTokenType.equal
                );
                break;
            case ">":
                this.addToken(
                    this.match("=")
                        ? AlgTokenType.greaterEqual
                        : AlgTokenType.greater
                );
                break;
            case "<":
                this.addToken(
                    this.match("=") ? AlgTokenType.lessEqual : AlgTokenType.less
                );
                break;
            case " ":
            case "\r":
            case "\n":
            case "\t":
                break;
            case "{":
                if (this.peek() === "{") {
                    this.jinja();
                    break;
                } else if (this.peek() === "#" || this.peek() === "%") {
                    this.error(
                        "Parsing of Algs containing jinja expressions/comments are not supported.",
                        AlgParsingErrorType.unsupportedJinja
                    );
                } else {
                    this.error(`Unexpected token: ${c}.`);
                }
            default:
                if (this.isAlphaNumeric(c)) {
                    this.alphaNumeric();
                } else {
                    this.error(`Unexpected token: ${c}.`);
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

    private addToken(type: AlgTokenType): void {
        this.tokens.push({
            type: type,
            content: this.source.substring(this.start, this.current),
            start: this.start,
            end: this.current,
        });
    }

    private alphaNumeric() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        const content = this.source.substring(this.start, this.current);
        if (this.isNumeric(content)) {
            if (this.peek() === "." && this.isDigit(this.peekNext())) {
                this.advance();
                while (this.isDigit(this.peek())) {
                    this.advance();
                }
            }
            this.addToken(AlgTokenType.number);
        } else {
            this.addToken(AlgTokenType.identifier);
        }
    }

    private isNumeric(content: string): boolean {
        let ind = 0;
        while (ind < content.length) {
            if (!this.isDigit(content.charAt(ind))) {
                return false;
            }
            ind += 1;
        }
        return true;
    }

    private isAlpha(char: string): boolean {
        return (
            (char >= "a" && char <= "z") ||
            (char >= "A" && char <= "Z") ||
            char === "_"
        );
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private isDigit(char: string): boolean {
        return char >= "0" && char <= "9";
    }

    private jinja() {
        this.advance();
        while (!this.isAtEnd() && !this.match("}")) {
            this.advance();
        }
        if (!this.match("}")) {
            this.error("Invalid jinja expression.");
        }
        this.addToken(AlgTokenType.jinja);
    }

    private error(
        message: string,
        type: AlgParsingErrorType = AlgParsingErrorType.default
    ): never {
        throw new AlgParsingError(
            message,
            {
                start: this.current - 1,
                end: this.current,
                content: "",
                type: AlgTokenType.error,
            },
            type
        );
    }
}
