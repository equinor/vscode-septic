/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) 2015 Robert Nystrom [CraftingInterpreters]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode-languageserver";

export interface IToken<T> {
    type: T;
    start: number;
    end: number;
    content: string;
}

export class ParserError<T> extends Error {
    public readonly token: IToken<T>;

    constructor(message: string, token: IToken<T>) {
        super(message);
        this.token = token;
    }
}

export abstract class Parser<T, RT> {
    protected readonly tokens: IToken<T>[];
    protected current: number = 0;

    constructor(tokens: IToken<T>[]) {
        this.tokens = tokens;
    }

    abstract parse(token: CancellationToken | undefined): RT | undefined;

    public advance() {
        if (!this.isAtEnd()) {
            this.current += 1;
            return this.previous();
        }
    }

    protected previous(): IToken<T> {
        return this.tokens[this.current - 1];
    }

    protected peek(): IToken<T> {
        return this.tokens[this.current];
    }

    protected isAtEnd(): boolean {
        return this.peek().type === "eof";
    }

    protected match(...tokenTypes: T[]): boolean {
        for (let i = 0; i < tokenTypes.length; i++) {
            if (this.check(tokenTypes[i])) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    protected check(tokenType: T): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        return this.peek().type === tokenType;
    }

    protected synchronize(
        errorMsg: string = "Unexpected token",
        ...tokenTypes: T[]
    ) {
        while (!this.isAtEnd()) {
            for (let i = 0; i < tokenTypes.length; i++) {
                if (this.check(tokenTypes[i])) {
                    return;
                }
            }
            this.error(errorMsg, this.peek());
            this.advance();
        }
    }

    protected consume(type: T, str: string) {
        if (this.check(type)) {
            return this.advance();
        }
        this.error(str, this.previous());
    }

    abstract error(message: string, token: IToken<T>): void;
}
