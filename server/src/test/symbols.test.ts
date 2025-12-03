import { getDocumentSymbols } from "../language-service/documentSymbolProvider";
import { parseSepticForTest } from "./util";
import { expect } from "chai";

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
        const documentSymbols = getDocumentSymbols(cnfg);
        expect(documentSymbols.length).to.equal(1);
        expect(documentSymbols[0].children?.length).to.equal(1);
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
      
		`;

        const cnfg = parseSepticForTest(text);
        const documentSymbols = getDocumentSymbols(cnfg);
        expect(documentSymbols.length).to.equal(2);
        expect(documentSymbols[0].children?.length).to.equal(0);
        expect(documentSymbols[1].children?.length).to.equal(1);
    });
});
