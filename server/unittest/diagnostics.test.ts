import {
    algDiagnostic,
    defaultDiagnosticsSettings,
    toSeverity,
} from "../src/language-service/diagnosticsProvider";
import { parseSeptic } from "../src/septic";
import { MockDocument } from "./util";

describe("Test algorithm diagnostics", () => {
    test("Missing paranthesis in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "add("
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings);
        expect(diag.length).toBe(1);
    });
    test("Unexpexted token in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "1+2+?"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings);
        expect(diag.length).toBe(1);
    });
    test("Missing reference in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings);
        expect(diag.length).toBe(1);
        expect(diag[0].severity).toBe(
            toSeverity(defaultDiagnosticsSettings.algMissingReference)
        );
    });
    test("Unknown function in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings);
        expect(diag.length).toBe(1);
        expect(diag[0].severity).toBe(
            toSeverity(defaultDiagnosticsSettings.algCalc)
        );
    });
    test("No errors for valid expression", () => {
        const text = `
      CalcPvr: Var1
        Text1= "Test"
        Alg= "1"

			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "abs(Var1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, defaultDiagnosticsSettings);
        expect(diag.length).toBe(0);
    });
});
