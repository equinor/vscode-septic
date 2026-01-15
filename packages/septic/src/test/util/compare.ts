/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-python]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from "chai";
import { Range } from "vscode-languageserver-textdocument";

export function compareRange(expectedRange: Range, actualRange: Range) {
    expect(expectedRange.start.line).to.equal(actualRange.start.line);
    expect(expectedRange.start.character).to.equal(actualRange.start.character);
    expect(expectedRange.end.line).to.equal(actualRange.end.line);
    expect(expectedRange.end.character).to.equal(actualRange.end.character);
}

export function compareFiles(expectedContent: string, actualContent: string) {
    const expectedLines = expectedContent.split(/\r?\n/);
    const actualLines = actualContent.split(/\r?\n/);

    for (
        let i = 0;
        i < Math.min(expectedLines.length, actualLines.length);
        i += 1
    ) {
        const e = expectedLines[i];
        const a = actualLines[i];
        expect(e, `Difference at line ${i}`).to.be.equal(a);
    }

    expect(
        actualLines.length,
        expectedLines.length > actualLines.length
            ? "Actual contains more lines than expected"
            : "Expected contains more lines than the actual",
    ).to.be.equal(expectedLines.length);
}
