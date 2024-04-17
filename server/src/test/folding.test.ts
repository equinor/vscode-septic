import { getFoldingRanges } from "../language-service/foldingRangeProvider";
import { parseSepticSync } from "../septic";
import { expect } from "chai";
import { MockDocument } from "./util";
import { CancellationTokenSource } from "vscode-languageserver";

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

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());
        const foldingRanges = getFoldingRanges(doc, cnfg);

        expect(foldingRanges.length).to.equal(3);
        expect(foldingRanges[0].startLine).to.equal(2);
        expect(foldingRanges[0].endLine).to.equal(11);
        expect(foldingRanges[1].startLine).to.equal(6);
        expect(foldingRanges[1].endLine).to.equal(11);
        expect(foldingRanges[2].startLine).to.equal(9);
        expect(foldingRanges[2].endLine).to.equal(11);
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

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());

        const foldingRanges = getFoldingRanges(doc, cnfg);

        expect(foldingRanges.length).to.equal(4);
        expect(foldingRanges[0].startLine).to.equal(2);
        expect(foldingRanges[0].endLine).to.equal(5);
        expect(foldingRanges[1].startLine).to.equal(6);
        expect(foldingRanges[1].endLine).to.equal(11);
        expect(foldingRanges[2].startLine).to.equal(9);
        expect(foldingRanges[2].endLine).to.equal(11);
        expect(foldingRanges[3].startLine).to.equal(12);
        expect(foldingRanges[3].endLine).to.equal(14);
    });
    it("Test cancellation of folding range", () => {
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
        const cnfg = parseSepticSync(doc.getText());
        const cts = new CancellationTokenSource();
        cts.cancel();
        const foldingRanges = getFoldingRanges(doc, cnfg, cts.token);
        expect(foldingRanges.length).to.equal(0);
    });
});
