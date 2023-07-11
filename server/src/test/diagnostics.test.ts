import { expect } from "chai";

import {
    validateAlgs,
    validateIdentifier,
    getDiagnostics,
    disableDiagnosticRegex,
    DiagnosticCode,
} from "../language-service/diagnosticsProvider";
import { parseSeptic } from "../septic";
import { MockDocument } from "./util";

describe("Test alg diagnostics", () => {
    it("Missing parenthesis in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "add("
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E201);
    });
    it("Unexpected token in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "1+2+?"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E201);
    });
    it("Missing reference in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.W101);
    });
    it("Unknown function in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E202);
    });
});

describe("Test parameter diagnostics in alg", () => {
    it("No diagnostics for correct number of params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(2.4,1,2,3,6)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("No diagnostics for correct number of params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1 < 2, 1, 0)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("No diagnostics for correct datatype", () => {
        const text = `
            Tvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test, 1, 1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Diagnostics for incorrect datatype", () => {
        const text = `
            Mvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test, 1, 1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E203);
    });
    it("No diagnostics for empty optional param", () => {
        const text = `
            Tvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test, , 1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Diagnostics for empty non-optional param", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1 < 2, , 0)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E205);
    });

    it("Diagnostics for incorrect parity of arguments", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(1,2,3,4)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E204);
    });

    it("No diagnostics for not using optional params", () => {
        const text = `
            Tvr: Test
                Text1= "Test"

			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Diagnostics for exceeding number of params", () => {
        const text = `
            Tvr: Test
                Text1= "Test"

			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test,1,2,3)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E204);
    });
    it("Diagnostics for fewer number of params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "and()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E204);
    });
    it("Multiple diagnostics for calc", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1<2, ,2, ,1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[0].code).to.equal(DiagnosticCode.E205);
        expect(diag[1].code).to.equal(DiagnosticCode.E204);
    });
});

describe("Test identifier diagnostics", () => {
    it("Error for identifier without letter", () => {
        const text = `
        Evr: 1234
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E101);
    });
    it("Error for identifier with invalid char", () => {
        const text = `
        Evr: Test***
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.E101);
    });
    it("No error for identifier with only jinja", () => {
        const text = `
        Evr: {{ Test }}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(0);
    });
    it("No error for valid identifier", () => {
        const text = `
        Evr: Something___123
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
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
        expect(diag.length).to.equal(2);
    });
    it("Using multiple codes for sameline", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something(tes)" // noqa: E202, W101
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
});
