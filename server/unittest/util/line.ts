export interface LineInfo {
  lineNumber: number;
  startOffset: number;
  endOffset: number;
}

export function getLines(str: string): LineInfo[] {
  const lineOffsets: LineInfo[] = [];
  let currentLineStart = 0;
  let currentLineEnd = 0;
  let lineNumber = 1;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\n") {
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

export function getLineNumber(offset: number, lineInfo: LineInfo[]): number {
  const line = lineInfo.find(
    (line) => offset >= line.startOffset && offset <= line.endOffset
  );
  if (line) {
    return line.lineNumber;
  }
  return -1;
}
