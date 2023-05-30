import { expect } from "chai";

import {
    algDiagnostic,
    defaultDiagnosticsSettings,
    toSeverity,
} from "../language-service/diagnosticsProvider";
import { parseSeptic } from "../septic";
import { MockDocument } from "./util";

describe("Test algorithm diagnostics", () => {
    it("Missing paranthesis in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "add("
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Unexpexted token in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "1+2+?"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Missing reference in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].severity).to.equal(
            toSeverity(defaultDiagnosticsSettings.algMissingReference)
        );
    });
    it("Unknown function in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].severity).to.equal(
            toSeverity(defaultDiagnosticsSettings.algCalc)
        );
    });
    it("No errors for valid expression", () => {
        const text = `
        Evr: Var1
            Text1= "Test"
            
      CalcPvr: Var1
        Text1= "Test"
        Alg= "1"

			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "abs(Var1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings, cnfg);
        expect(diag.length).to.equal(0);
    });
});
