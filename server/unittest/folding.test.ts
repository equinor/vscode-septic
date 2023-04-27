import { MockDocument } from "./util";
import { getFoldingRanges } from "../src/language-service/foldingRangeProvider";
import { parseSeptic } from "../src/parser";

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

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        const foldingRanges = getFoldingRanges(doc, cnfg);

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

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());

        const foldingRanges = getFoldingRanges(doc, cnfg);

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
