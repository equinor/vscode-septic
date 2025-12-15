import { Range } from "vscode-languageserver-types";
import { TextDocument } from "vscode-languageserver-textdocument";

export function offsetToPositionRange(
    offsetRange: { start: number; end: number },
    doc: TextDocument,
): Range {
    return {
        start: doc.positionAt(offsetRange.start),
        end: doc.positionAt(offsetRange.end),
    };
}
