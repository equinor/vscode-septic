/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IToken } from "./parser";

export enum SepticTokenType {
    object,
    attribute,
    blockComment,
    lineComment,
    jinjaComment,
    jinjaExpression,
    numeric,
    string,
    skip,
    unknown,
    identifier,
    eof = "eof",
}

export type SepticToken = IToken<SepticTokenType>;
