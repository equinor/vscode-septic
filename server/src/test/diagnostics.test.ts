import { expect } from "chai";

import {
    algDiagnostic,
    identifierDiagnostics,
    getDiagnostics,
    disableDiagnosticRegex,
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
        let diag = algDiagnostic(cnfg, doc, cnfg);
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
        let diag = algDiagnostic(cnfg, doc, cnfg);
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
        let diag = algDiagnostic(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Unknown function in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
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
			Alg= "abs(Var1)*{{Test}}"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = algDiagnostic(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
});

describe("Test identifier diagnostics", () => {
    it("Error for identifier without letter", () => {
        const text = `
        Evr: 1234
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = identifierDiagnostics(cnfg, doc);
        expect(diag.length).to.equal(1);
    });
    it("Error for identifier with invalid char", () => {
        const text = `
        Evr: Test***
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = identifierDiagnostics(cnfg, doc);
        expect(diag.length).to.equal(1);
    });
    it("No error for identifier with only jinja", () => {
        const text = `
        Evr: {{ Test }}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = identifierDiagnostics(cnfg, doc);
        expect(diag.length).to.equal(0);
    });
    it("No error for valid identifier", () => {
        const text = `
        Evr: Something___123
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = identifierDiagnostics(cnfg, doc);
        expect(diag.length).to.equal(0);
    });
});

describe("Test regex for disabling diagnostics", () => {
    it("Test disable regex for valid expressions", () => {
        expect(disableDiagnosticRegex.test("// noqa ")).to.equal(true);
        expect(disableDiagnosticRegex.test("// noqa: E102")).to.equal(true);
        expect(disableDiagnosticRegex.test("// noqa: E101, E201 ")).to.equal(
            true
        );
        expect(disableDiagnosticRegex.test("{# noqa #}")).to.equal(true);
        expect(disableDiagnosticRegex.test("{# noqa: E102 #}")).to.equal(true);
        expect(disableDiagnosticRegex.test("{# noqa: E102, E201 #}")).to.equal(
            true
        );
    });
    it("Test disable regex for invalid expressions", () => {
        expect(disableDiagnosticRegex.test("// NoQ ")).to.equal(false);
        expect(disableDiagnosticRegex.test("// NQA E102")).to.equal(false);
        expect(disableDiagnosticRegex.test("{# NoQ #}")).to.equal(false);
    });
});

describe("Test disabling of diagnostics", () => {
    it("Disabling diagnostics using line comment", () => {
        const text = `
        Evr: 1234 // noqa
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Disabling diagnostics using jinja comment", () => {
        const text = `
        Evr: 1234 {# noqa #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Disabling diagnostics using code", () => {
        const text = `
        Evr: 1234 {# noqa: E101 #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Not disabling diagnostics using empty code", () => {
        const text = `
        Evr: 1234 {# noqa: #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Not disabling diagnostics using wrong code", () => {
        const text = `
        Evr: 1234 {# noqa: E201 #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Not disabling diagnostics using wrong code", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something" // noqa: E203
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Using multiple codes for sameline", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something(tes)" // noqa: E202,E203
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
});
