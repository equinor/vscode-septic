/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";

export function validateFileExists(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
}

export function createDocumentFromFile(filePath: string): TextDocument {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return TextDocument.create(
        path.resolve(filePath),
        "septic",
        0,
        fileContent,
    );
}
