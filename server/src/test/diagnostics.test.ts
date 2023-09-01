import { expect } from "chai";

import {
    validateAlgs,
    validateIdentifier,
    getDiagnostics,
    disableDiagnosticRegex,
    DiagnosticCode,
    validateObject,
    checkAttributeDataType,
    validateObjectReferences,
    validateObjectParent,
} from "../language-service/diagnosticsProvider";
import {
    AttributeValue,
    SepticAttributeDocumentation,
    SepticMetaInfoProvider,
    SepticObjectInfo,
    SepticTokenType,
    parseSeptic,
} from "../septic";
import { MockDocument } from "./util";

describe("Test diagnostics for invalid algs", () => {
    it("Expect diagnostics for missing parenthesis in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "add("
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics for unexpected token in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "1+2+?"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics when alg contains multiple expressions", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "(1+1)(1+2)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics when alg exceeds maximum length", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "${"x".repeat(1000)}"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[0].code).to.equal(DiagnosticCode.algMaxLength);
    });
    it("Expect no diagnostics when alg exceeds maximum length but contains jinja", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "${"x".repeat(1000)}+{{ Test }}"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.not.equal(DiagnosticCode.algMaxLength);
    });
});

describe("Test diagnostics for references in algs", () => {
    it("Expect diagnostics for undefined reference in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingReference);
    });
    it("Expect no diagnostics for defined reference in alg", () => {
        const text = `
            Evr: var1
            
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for pure jinja expression in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "{{ Test }}"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for undefined reference in alg with jinja", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1{{ Test }}"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingReference);
    });
    it("Expect diagnostics for reference to unknown calc in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.unknownCalc);
    });
    it("Expect no diagnostics for reference to known calc in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "or(1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for correctly used public property", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr.SSVal"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for missing property after .", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr."
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingPublicProperty);
    });
    it("Expect diagnostics for unknown property", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr.BS"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.unknownPublicProperty);
    });
});

describe("Test parameter diagnostics in alg", () => {
    it("Expect no diagnostics for correct number of params", () => {
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
    it("Expect no diagnostics for correct number of params", () => {
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
    it("Expect no diagnostics for correct datatype", () => {
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

    it("Expect diagnostics for incorrect datatype", () => {
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeArg);
    });
    it("Expect diagnostics when giving expression to param that expect object", () => {
        const text = `
            Mvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(1+2, 1, 1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeArg);
    });
    it("Expect diagnostics when giving value to param that expect object", () => {
        const text = `
            Mvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(1, 1, 1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeArg);
    });
    it("Expect no diagnostics for empty optional param", () => {
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
    it("Expect diagnostics for empty non-optional param", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1 < 2, , 0)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(
            DiagnosticCode.missingValueNonOptionalArg
        );
    });

    it("Expect diagnostics for incorrect parity of arguments", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(1,2,3,4)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfArgs);
    });

    it("Expect no diagnostics for not using optional params", () => {
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

    it("Expect diagnostics for exceeding number of params in calc", () => {
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfArgs);
    });
    it("Expect that we get diagnostic when too few params are used in calc", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "and()"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfArgs);
    });
    it("Expect that validation catches multiple issues in one alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1<2, ,2, ,1)"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[0].code).to.equal(
            DiagnosticCode.missingValueNonOptionalArg
        );
        expect(diag[1].code).to.equal(DiagnosticCode.invalidNumberOfArgs);
    });
    it("Expect that validation ignore alg attributes without value", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= 
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateAlgs(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
});

describe("Test identifier diagnostics", () => {
    it("Expect diagnostics for missing identifier", () => {
        const text = `
        Evr:  
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidIdentifier);
    });
    it("Expect diagnostics for identifier without letter", () => {
        const text = `
        Evr: 1234
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidIdentifier);
    });
    it("Expect diagnostics for identifier with invalid char", () => {
        const text = `
        Evr: Test***
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidIdentifier);
    });
    it("Expect no diagnostics for identifier with only jinja", () => {
        const text = `
        Evr: {{ Test }}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for valid identifier", () => {
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
    it("Expect no diagnostics for disabled line using line comment", () => {
        const text = `
        Mvr: 1234 // noqa
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for disabled line using jinja comment", () => {
        const text = `
        Mvr: 1234 {# noqa #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for disabled line using correct code", () => {
        const text = `
        Mvr: 1234 {# noqa: E101 #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for attempted disabled line when not giving codes", () => {
        const text = `
        Mvr: 1234 {# noqa: #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Expect diagnostics for disabled line using wrong code", () => {
        const text = `
        Mvr: 1234 {# noqa: E201 #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Expect diagnostics for disabled line using wrong code", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something" // noqa: E203
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[1].code).to.not.equal(DiagnosticCode.invalidDataTypeArg);
    });
    it("Expect no diagnostics for disabled line with multiple codes", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something(tes)" // noqa: E202, W101
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Expect that regular comments are ignored", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something(tes)" // This is a noqa line
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(3);
    });
});

describe("Test validation of attributes", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const mvrDoc = metaInfoProvider.getObjectDocumentation("Mvr");
    const mvrInfo = metaInfoProvider.getObject("Mvr");
    it("Expect diagnostics for attribute without value", () => {
        const text = `
            Mvr: Test
            Text1= 
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingAttributeValue);
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            Text1= 1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeAttribute);
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            IvPrio= 1.1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeAttribute);
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            LockHL= 1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeAttribute);
    });
    it("Expect diagnostics for attribute with wrong enum value", () => {
        const text = `
            Mvr: Test
            LockHL= TEST
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeAttribute);
    });
    it("Expect diagnostics when giving list to non-list attribute", () => {
        const text = `
            Mvr: Test
            Nfix= 1 1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.unexpectedList);
    });
    it("Expect diagnostics when not giving list to list attribute", () => {
        const text = `
            Mvr: Test
            Blocking= 11
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingListAttribute);
    });
    it("Expect diagnostics for attribute with mismatch on list length", () => {
        const text = `
            Mvr: Test
            Blocking= 2 1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.mismatchLengthList);
    });

    it("Expect diagnostics for attribute with wrong datatype for list indicator", () => {
        const text = `
            Mvr: Test
            Blocking= 2.2 1
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingListLengthValue);
    });
    it("Expect no diagnostics for attribute with correct list", () => {
        const text = `
            Mvr: Test
            Blocking= 3 1 2 3
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for unknown attribute", () => {
        const text = `
            Mvr: Test
            BsAttr= 3
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.unknownAttribute);
    });

    it("Expect diagnostics for invalid char in string", () => {
        const text = `
            Mvr: Test
            Text1= "'"
        `;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const diag = validateObject(
            cnfg.objects[0],
            doc,
            cnfg,
            mvrDoc!,
            mvrInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidCharInString);
    });
});

describe("Test validation of attribute data type", () => {
    const createAttrDoc = (
        datatype: string,
        enums: string[]
    ): SepticAttributeDocumentation => {
        return {
            briefDescription: "",
            dataType: datatype,
            detailedDescription: "",
            enums: enums,
            list: false,
            name: "",
            tags: [],
            default: "",
        };
    };
    it("Check valid bitmask", () => {
        const attrValue = new AttributeValue("10000", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Bit5", []))
        ).to.equal(true);
    });
    it("Check valid bitmask", () => {
        const attrValue = new AttributeValue(
            "0000000000000000000010000000001",
            SepticTokenType.numeric
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Bit31", []))
        ).to.equal(true);
    });
    it("Check invalid bitmask", () => {
        const attrValue = new AttributeValue(
            "000000000000000000001000000000",
            SepticTokenType.numeric
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Bit31", []))
        ).to.equal(false);
    });
    it("Check invalid bitmask", () => {
        const attrValue = new AttributeValue(
            "2000000000000000000010000000001",
            SepticTokenType.numeric
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Bit31", []))
        ).to.equal(false);
    });
    it("Check valid int", () => {
        const attrValue = new AttributeValue("1", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Int", []))
        ).to.equal(true);
    });
    it("Check invalid int", () => {
        const attrValue = new AttributeValue("1.1", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Int", []))
        ).to.equal(false);
    });
    it("Check invalid int", () => {
        const attrValue = new AttributeValue("1e+10", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Int", []))
        ).to.equal(false);
    });
    it("Check valid double", () => {
        const attrValue = new AttributeValue("1e+10", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Double", []))
        ).to.equal(true);
    });
    it("Check invalid double", () => {
        const attrValue = new AttributeValue("Test", SepticTokenType.string);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Double", []))
        ).to.equal(false);
    });
    it("Check valid string", () => {
        const attrValue = new AttributeValue("Test", SepticTokenType.string);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("String", []))
        ).to.equal(true);
    });
    it("Check invalid string", () => {
        const attrValue = new AttributeValue("1.1", SepticTokenType.numeric);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("String", []))
        ).to.equal(false);
    });
    it("Check valid enum", () => {
        const attrValue = new AttributeValue(
            "TEST",
            SepticTokenType.identifier
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Enum", ["TEST"]))
        ).to.equal(true);
    });
    it("Check invalid enum", () => {
        const attrValue = new AttributeValue("TES", SepticTokenType.identifier);
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Enum", ["TEST"]))
        ).to.equal(false);
    });
    it("Check jinja expression", () => {
        const attrValue = new AttributeValue(
            "{{ TEST }}",
            SepticTokenType.jinjaExpression
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("String", ["TEST"]))
        ).to.equal(true);
    });
    it("Check jinja expression", () => {
        const attrValue = new AttributeValue(
            "{{ TEST }}",
            SepticTokenType.jinjaExpression
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("Int", []))
        ).to.equal(true);
    });
});

describe("Test validation of object references", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    it("Expect diagnostics for missing reference in identifier", () => {
        const text = `
            SopcMvr: TestMvr

            Mvr: MvrTest       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const objectInfo = metaInfoProvider.getObject("SopcMvr");
        let diag = validateObjectReferences(
            cnfg.objects[0],
            doc,
            cnfg,
            objectInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingReference);
    });
    it("Expect no  diagnostics for correct reference in identifier", () => {
        const text = `
            SopcMvr: MvrTest

            Mvr: MvrTest       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const objectInfo = metaInfoProvider.getObject("SopcMvr");
        let diag = validateObjectReferences(
            cnfg.objects[0],
            doc,
            cnfg,
            objectInfo!
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for missing reference in attr list", () => {
        const text = `
            Mvr: TestMvr

            MvrList: Test
            Mvrs= 1 "MvrTest"       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const objectInfo = metaInfoProvider.getObject("MvrList");
        let diag = validateObjectReferences(
            cnfg.objects[1],
            doc,
            cnfg,
            objectInfo!
        );
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingReference);
    });
    it("Expect no diagnostics for corret reference in attr list", () => {
        const text = `
            Mvr: TestMvr

            MvrList: Test
            Mvrs= 1 "TestMvr"       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        const objectInfo = metaInfoProvider.getObject("MvrList");
        let diag = validateObjectReferences(
            cnfg.objects[1],
            doc,
            cnfg,
            objectInfo!
        );
        expect(diag.length).to.equal(0);
    });
});

describe("Test validation of object structure", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    it("Expect no diagnostics for correct structure", () => {
        const text = `
            CalcModl: TestModl

            CalcPvr: Test
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[1], doc);
        expect(diag.length).to.equal(0);
    });

    it("Expect diagnostics for incorrect structure", () => {
        const text = `
        CalcPvr: Test

        CalcModl: TestModl
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.missingParentObject);
    });

    it("Expect diagnostics for incorrect structure", () => {
        const text = `
        CalcPvr: Test

        CalcModl: TestModl
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[1], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidParentObject);
    });

    it("Expect diagnostics for unexpected object on same level structure", () => {
        const text = `
        SmpcAppl: Test1

        DmmyAppl: Test2

        Mvr: Test3
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[2], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidParentObject);
    });

    it("Expect no diagnostics for object on same level structure", () => {
        const text = `
        DmmyAppl: Test2

        SmpcAppl: Test1

        Mvr: Test3
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[2], doc);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for object on same level structure", () => {
        const text = `
        DmmyAppl: Test1
        
        CalcModl: Test2

        CalcPvr: Test3

        Evr: Test4
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[3], doc);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for correct root object", () => {
        const text = `
        System: Test1
        "       
		`;
        const doc = new MockDocument(text);
        const cnfg = parseSeptic(doc.getText());
        cnfg.updateObjectParents(metaInfoProvider.getObjectHierarchy());
        let diag = validateObjectParent(cnfg.objects[0], doc);
        expect(diag.length).to.equal(0);
    });
});
