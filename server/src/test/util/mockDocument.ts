import { ITextDocument } from "../../language-service";
import { Position, Range, URI } from "vscode-languageserver";

export class MockDocument implements ITextDocument {
    uri: string = "";
    $uri?: URI = "";
    version: number = 0;
    lineCount: number = 0;

    constructor(private readonly text: string) { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getText(range?: Range | undefined): string {
        return this.text;
    }

    positionAt(offset: number): Position {
        return getPosition(this.text, offset);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offsetAt(position: Position): number {
        return -1;
    }
}

interface LineInfo {
    lineNumber: number;
    startOffset: number;
    endOffset: number;
}

export function getPosition(text: string, offset: number): Position {
    const lines = getLines(text);

    const line = lines.find(
        (line) => offset >= line.startOffset && offset <= line.endOffset
    );

    if (line) {
        return { line: line.lineNumber, character: offset - line.startOffset };
    }

    return { line: -1, character: -1 };
}

function getLines(text: string): LineInfo[] {
    const lineOffsets: LineInfo[] = [];
    let currentLineStart = 0;
    let currentLineEnd = 0;
    let lineNumber = 1;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === "\n") {
            lineOffsets.push({
                lineNumber: lineNumber,
                startOffset: currentLineStart,
                endOffset: currentLineEnd,
            });
            currentLineStart = i;
            lineNumber++;
        } else {
            currentLineEnd = i;
        }
    }

    lineOffsets.push({
        lineNumber: lineNumber,
        startOffset: currentLineStart,
        endOffset: currentLineEnd,
    });

    return lineOffsets;
}
