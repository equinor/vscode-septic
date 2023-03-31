import { MockDocument, getLines, getLineNumber, LineInfo } from "./util";
import { Position } from "vscode-languageserver";
import { getFoldingRanges, getLevel } from "../src/language-service/folding";
import { SepticObject } from "../src/parser";

describe("Test of folding levels", () => {
  test("Test variables", () => {
    expect(getLevel(new SepticObject("SopcMvr", null))).toBe(2);
    expect(getLevel(new SepticObject("Evr", null))).toBe(2);
    expect(getLevel(new SepticObject("Mvr", null))).toBe(2);
    expect(getLevel(new SepticObject("CalcPvr", null))).toBe(3);
  });
});

describe("Test folding of document", () => {
  test("Test folding of increasing levels", () => {
    const text = `
		  System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test æ, 2: Test ø, 3: Test å"
			
			SopcMvr:       TestMvr
         Text1=  "Test Mvr"
			
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
		`;

    const mockGetText = jest.fn(() => {
      return text;
    });
    const lines: LineInfo[] = getLines(text);

    const mockPositionAt = jest.fn((offset): Position => {
      return { line: getLineNumber(offset, lines), character: 0 };
    });

    const doc = new MockDocument(mockGetText, mockPositionAt);
    let foldingRanges = getFoldingRanges(doc, undefined);

    expect(foldingRanges.length).toBe(3);
    expect(foldingRanges[0].startLine).toBe(2);
    expect(foldingRanges[0].endLine).toBe(11);
    expect(foldingRanges[1].startLine).toBe(6);
    expect(foldingRanges[1].endLine).toBe(11);
    expect(foldingRanges[2].startLine).toBe(9);
    expect(foldingRanges[2].endLine).toBe(11);
  });

  test("Test folding of same levels", () => {
    const text = `
		  System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test æ, 2: Test ø, 3: Test å"
			
			SopcProc:       TestMvr
         Text1=  "Test Mvr"
			
			ExprModel:  TestCalcPvr 
				Text1= "Test"
      
      Appl: Test
        Text1= "Test"
		`;

    const mockGetText = jest.fn(() => {
      return text;
    });
    const lines: LineInfo[] = getLines(text);

    const mockPositionAt = jest.fn((offset): Position => {
      return { line: getLineNumber(offset, lines), character: 0 };
    });

    const doc = new MockDocument(mockGetText, mockPositionAt);
    let foldingRanges = getFoldingRanges(doc, undefined);

    expect(foldingRanges.length).toBe(4);
    expect(foldingRanges[0].startLine).toBe(2);
    expect(foldingRanges[0].endLine).toBe(5);
    expect(foldingRanges[1].startLine).toBe(6);
    expect(foldingRanges[1].endLine).toBe(14);
    expect(foldingRanges[2].startLine).toBe(9);
    expect(foldingRanges[2].endLine).toBe(11);
    expect(foldingRanges[3].startLine).toBe(12);
    expect(foldingRanges[3].endLine).toBe(14);
  });
});
