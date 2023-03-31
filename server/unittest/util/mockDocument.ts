import { ITextDocument } from "../../src/language-service";
import { Position, Range, URI } from "vscode-languageserver";

export class MockDocument implements ITextDocument {
  uri: string;
  $uri?: URI;
  version: number;
  lineCount: number;

  getTextMock: CallableFunction;
  getPositionAtMock: CallableFunction;

  constructor(getTextMock, getPositionAtMock) {
    this.uri = "";
    this.$uri = "";
    this.version = 0;
    this.lineCount = 0;
    this.getPositionAtMock = getPositionAtMock;
    this.getTextMock = getTextMock;
  }

  getText(range?: Range | undefined): string {
    return this.getTextMock(range);
  }

  positionAt(offset: number): Position {
    return this.getPositionAtMock(offset);
  }
}
