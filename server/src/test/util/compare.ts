import { expect } from "chai";
import { Range } from "vscode-languageserver";

export function compareRanges(expectedRange: Range, actualRange: Range) {
    expect(expectedRange.start.line).to.equal(actualRange.start.line);
    expect(expectedRange.start.character).to.equal(actualRange.start.character);
    expect(expectedRange.end.line).to.equal(actualRange.end.line);
    expect(expectedRange.end.character).to.equal(actualRange.end.character);
}
