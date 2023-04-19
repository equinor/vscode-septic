import { MockDocument } from "./util";
import { parseSeptic } from "../src/parser";
import { getDocumentSymbols } from "../src/language-service/documentSymbolProvider";
import { defaultHiearchySettings } from "../src/util";

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
    const documentSymbols = getDocumentSymbols(
      doc,
      cnfg,
      defaultHiearchySettings
    );

    expect(documentSymbols.length).toBe(1);
    expect(documentSymbols[0].children?.length).toBe(1);
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

    const documentSymbols = getDocumentSymbols(
      doc,
      cnfg,
      defaultHiearchySettings
    );

    expect(documentSymbols.length).toBe(2);
    expect(documentSymbols[0].children?.length).toBe(0);
    expect(documentSymbols[1].children?.length).toBe(2);
  });
});
