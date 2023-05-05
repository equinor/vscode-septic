import { Range } from "vscode-languageserver-types";
import { ITextDocument } from "../language-service";

export function offsetToPositionRange(
    offsetRange: { start: number; end: number },
    doc: ITextDocument
): Range {
    return {
        start: doc.positionAt(offsetRange.start),
        end: doc.positionAt(offsetRange.end),
    };
}
