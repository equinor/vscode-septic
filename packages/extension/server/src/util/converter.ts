import { TextDocument, Range } from "vscode-languageserver-textdocument";

export function offsetToPositionRange(
    offsetRange: { start: number; end: number },
    doc: TextDocument,
): Range {
    return {
        start: doc.positionAt(offsetRange.start),
        end: doc.positionAt(offsetRange.end),
    };
}
