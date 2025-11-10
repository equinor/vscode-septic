import { getFoldingRanges } from "../language-service/foldingRangeProvider";
import { expect } from "chai";
import { parseSepticForTest } from "./util";

describe("Test folding of document", () => {
    it("Test folding of increasing levels", () => {
        const text = `
		  System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test æ, 2: Test ø, 3: Test å"
			
			SopcMvr:       TestMvr
         Text1=  "Test Mvr"
			
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
		`;
        const cnfg = parseSepticForTest(text);
        const foldingRanges = getFoldingRanges(cnfg);
        expect(foldingRanges.length).to.equal(3);
        expect(foldingRanges[0].startLine).to.equal(1);
        expect(foldingRanges[0].endLine).to.equal(9);
        expect(foldingRanges[1].startLine).to.equal(5);
        expect(foldingRanges[1].endLine).to.equal(9);
        expect(foldingRanges[2].startLine).to.equal(8);
        expect(foldingRanges[2].endLine).to.equal(9);
    });

    it("Test folding of same levels", () => {
        const text = `
		  System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test æ, 2: Test ø, 3: Test å"
			
			SopcProc:       TestMvr
         Text1=  "Test Mvr"
			
			ExprModel:  TestCalcPvr 
				Text1= "Test"
      
        DmmyAppl: Test
        Text1= "Test"
		`;
        const cnfg = parseSepticForTest(text);
        const foldingRanges = getFoldingRanges(cnfg);
        expect(foldingRanges.length).to.equal(4);
        expect(foldingRanges[0].startLine).to.equal(1);
        expect(foldingRanges[0].endLine).to.equal(4);
        expect(foldingRanges[1].startLine).to.equal(5);
        expect(foldingRanges[1].endLine).to.equal(10);
        expect(foldingRanges[2].startLine).to.equal(8);
        expect(foldingRanges[2].endLine).to.equal(10);
        expect(foldingRanges[3].startLine).to.equal(11);
        expect(foldingRanges[3].endLine).to.equal(12);
    });
});
