/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Position, Range, URI } from "vscode-languageserver";

export interface ITextDocument {
    /**
     * The uri of the document, as a string.
     */
    readonly uri: string;

    /**
     * The uri of the document, as a URI.
     */
    readonly $uri?: URI;

    /**
     * Version number of the document's content.
     */
    readonly version: number;

    /**
     * The total number of lines in the document.
     */
    readonly lineCount: number;

    /**
     * Get text contents of the document.
     *
     * @param range Optional range to get the text of. If not specified, the entire document content is returned.
     */
    getText(range?: Range): string;

    /**
     * Converts an offset in the document into a {@link Position position}.
     */
    positionAt(offset: number): Position;

    offsetAt(position: Position): number;
}
