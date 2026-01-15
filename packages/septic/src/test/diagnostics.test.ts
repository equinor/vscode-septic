import { expect } from "chai";

import {
    validateAlgs,
    validateIdentifier,
    getDiagnostics,
    disableDiagnosticRegex,
    SepticDiagnosticCode,
    checkAttributeDataType,
    validateObjectReferences,
    validateObjectParent,
    validateAttribute,
    validateComments,
    validateObject,
} from "../diagnostics";
import {
    SepticAttributeDocumentation,
    SepticMetaInfoProvider,
} from "../metaInfoProvider";
import { SepticAttributeValue, SepticTokenType } from "../elements";
import { parseSepticForTest } from "./util";

SepticMetaInfoProvider.setVersion("v3.0");

describe("Test diagnostics for invalid algs", () => {
    it("Expect diagnostics for missing parenthesis in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "add("
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics for unexpected token in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "1+2+?"
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics when alg contains multiple expressions", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "(1+1)(1+2)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidAlg);
    });
    it("Expect diagnostics when alg exceeds maximum length", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "${"x".repeat(1000)}"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.algMaxLength);
    });
    it("Expect no diagnostics when alg exceeds maximum length but contains jinja", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "${"x".repeat(1000)}+{{ Test }}"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.not.equal(SepticDiagnosticCode.algMaxLength);
    });
});

describe("Test diagnostics for references in algs", () => {
    it("Expect diagnostics for undefined reference in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
    it("Expect no diagnostics for defined reference in alg", () => {
        const text = `
            Evr: var1
            
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for pure jinja expression in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "{{ Test }}"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for undefined reference in alg with jinja", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "var1{{ Test }}"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
    it("Expect diagnostics for reference to unknown calc in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "testbs()"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.unknownCalc);
    });
    it("Expect no diagnostics for reference to known calc in alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "or(1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for correctly used public property", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr.SSval"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for missing property after .", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr."
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingPublicProperty,
        );
    });
    it("Expect diagnostics for unknown property", () => {
        const text = `
            Mvr: TestMvr
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "TestMvr.BS"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.unknownPublicProperty,
        );
    });
});

describe("Test datatype diagnostics in algs", () => {
    it("Expect no diagnostics for correct datatype", () => {
        const text = `
            Tvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test, 1, 1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
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

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidDataTypeArg);
    });
    it("Expect diagnostics when giving expression to param that expect object", () => {
        const text = `
            Mvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(1+2, 1, 1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidDataTypeArg);
    });
    it("Expect diagnostics when giving value to param that expect object", () => {
        const text = `
            Mvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(1, 1, 1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidDataTypeArg);
    });
    it("Expect no diagnostics when using public property on valid xvr on param that expects value", () => {
        const text = `
            Mvr: TestSomething
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "max(TestSomething.Meas)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics when giving pure jinja expression to param that expects value", () => {
        const text = `
            Mvr: TestSomething
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "max({{Test}})"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect missing reference diagnostics when giving non xvr object to param that expects value", () => {
        const text = `
            System: TestSomething
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "max(TestSomething)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
});

describe("Test parameter diagnostics in alg", () => {
    it("Expect no diagnostics for correct number of params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(2.4,1,2,3,6)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for correct number of params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1 < 2, 1, 0)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for empty optional param", () => {
        const text = `
            Tvr: Test
                Text1= "Test"
        
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test, , 1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for empty non-optional param", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1 < 2, , 0)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingValueNonOptionalArg,
        );
    });

    it("Expect no diagnostics for not using optional params", () => {
        const text = `
            Tvr: Test
                Text1= "Test"

			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "labupdt(Test)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
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

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect that we get diagnostic when too few params are used in calc", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "and()"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect that validation catches multiple issues in one alg", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "if(1<2, ,2, ,1)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(2);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingValueNonOptionalArg,
        );
        expect(diag[1]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect that validation ignore alg attributes without value", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= 
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics too many params", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "hvapw(20, 20, 20)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect diagnostics for variable length with wrong number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "distmix(95, 85, 2, 1, 2, 3, 4, 5)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect no diagnostics for exact variable length with correct number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "distmix(95, 85, 2, 1, 2, 3, 4, 5, 6)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for variable length with wrong number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(11,1,2,3)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidNumberOfParams,
        );
    });
    it("Expect no diagnostics for variable length with correct number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "intpoltype1(11,1,2,3,4)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for calc with variable length parameters and fixed parameter at end of calc with correct number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "ifelif(1 < 2, 1, 2 < 3, 3, 4)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for calc with variable length parameters and fixed parameter at end of calc with incorrect number", () => {
        const text = `
			CalcPvr:  TestCalcPvr 
				Text1= "Test"
				Alg= "ifelif(1 < 2, 1, 2 < 3, 3)"
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateAlgs(cnfg, cnfg);
        expect(diag.length).to.equal(1);
    });
});

describe("Test identifier diagnostics", () => {
    it("Expect diagnostics for missing identifier", () => {
        const text = `
        Evr:  
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateIdentifier(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingIdentifier);
    });
    it("Expect diagnostics for identifier without letter", () => {
        const text = `
        Evr: 1234
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateIdentifier(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidIdentifier);
    });
    it("Expect diagnostics for identifier with invalid char", () => {
        const text = `
        Evr: Test***
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateIdentifier(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidIdentifier);
    });
    it("Expect no diagnostics for identifier with only jinja", () => {
        const text = `
        Evr: {{ Test }}
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateIdentifier(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for valid identifier", () => {
        const text = `
        Evr: Something___123
		`;

        const cnfg = parseSepticForTest(text);
        const diag = validateIdentifier(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(0);
    });
});

describe("Test regex for disabling diagnostics", () => {
    it("Test disable regex for valid expressions", () => {
        expect(disableDiagnosticRegex.test("// noqa ")).to.equal(true);
        expect(disableDiagnosticRegex.test("// noqa: E102")).to.equal(true);
        expect(disableDiagnosticRegex.test("// noqa: E101, E201 ")).to.equal(
            true,
        );
        expect(disableDiagnosticRegex.test("{# noqa #}")).to.equal(true);
        expect(disableDiagnosticRegex.test("{# noqa: E102 #}")).to.equal(true);
        expect(disableDiagnosticRegex.test("{# noqa: E102, E201 #}")).to.equal(
            true,
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

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for disabled line using jinja comment", () => {
        const text = `
        Mvr: 1234 {# noqa #}
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for disabled line using correct codes", () => {
        const text = `
        Mvr: 1234 {# noqa: W101, W402 #}
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for attempted disabled line when not giving codes", () => {
        const text = `
        Mvr: 1234 {# noqa: #}
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(2);
    });
    it("Expect diagnostics for disabled line using wrong code", () => {
        const text = `
        Mvr: 1234 {# noqa: E201, W402 #}
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidIdentifier);
    });
    it("Expect diagnostics for disabled line using wrong code", () => {
        const text = `
        CalcPvr:  Test // noqa: W402, W501
            Alg=  "something" // noqa: W401
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
    it("Expect no diagnostics for disabled line with multiple codes", () => {
        const text = `
        CalcPvr:  Test // noqa
            Alg=  "something(tes)" // noqa: E202, W501
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect that regular comments are ignored", () => {
        const text = `
        CalcPvr:  Test
            Alg=  "something(tes)" // This is a noqa line
		`;

        const cnfg = parseSepticForTest(text);
        const diag = getDiagnostics(cnfg, cnfg);
        expect(diag.length).to.not.equal(0);
    });
});

describe("Test validation of attributes", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const mvrDoc = metaInfoProvider.getObjectDocumentation("Mvr");
    it("Expect diagnostics for attribute without value", () => {
        const text = `
            Mvr: Test
            Text1= 
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingAttributeValue,
        );
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            Text1= 1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidDataTypeAttribute,
        );
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            IvPrio= 1.1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidDataTypeAttribute,
        );
    });
    it("Expect diagnostics for attribute with wrong data type", () => {
        const text = `
            Mvr: Test
            LockHL= 1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidDataTypeAttribute,
        );
    });
    it("Expect diagnostics for attribute with wrong enum value", () => {
        const text = `
            Mvr: Test
            LockHL= TEST
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidDataTypeAttribute,
        );
    });
    it("Expect diagnostics when giving list to non-list attribute", () => {
        const text = `
            Mvr: Test
            Nfix= 1 1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.unexpectedList);
    });
    it("Expect diagnostics when not giving list to list attribute", () => {
        const text = `
            Mvr: Test
            Blocking= 11
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingListAttribute,
        );
    });
    it("Expect diagnostics for attribute with mismatch on list length", () => {
        const text = `
            Mvr: Test
            Blocking= 2 1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.mismatchLengthList);
    });

    it("Expect diagnostics for attribute with wrong datatype for list indicator", () => {
        const text = `
            Mvr: Test
            Blocking= 2.2 1
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingListLengthValue,
        );
    });
    it("Expect no diagnostics for attribute with correct list", () => {
        const text = `
            Mvr: Test
            Blocking= 3 1 2 3
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for unknown attribute", () => {
        const text = `
            Mvr: Test
            BsAttr= 3
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.unknownAttribute);
    });

    it("Expect diagnostics for invalid char in string", () => {
        const text = `
            Mvr: Test
            Text1= "'"
        `;
        const cnfg = parseSepticForTest(text);
        const diag = validateAttribute(
            cnfg.objects[0]!.attributes[0]!,
            cnfg.doc,
            mvrDoc!,
            new Map(),
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidCharInString,
        );
    });
});

describe("Test check for duplicated attributes", () => {
    it("Expect diagnostics for duplicated attributes", () => {
        const text = `
            Mvr: Test
            Text1= ""
            Text1= ""
        `;
        const objectDoc =
            SepticMetaInfoProvider.getInstance().getObjectDocumentation("Mvr");
        const objectInfo =
            SepticMetaInfoProvider.getInstance().getObject("Mvr");
        const cnfg = parseSepticForTest(text);
        const diag = validateObject(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectDoc!,
            objectInfo,
        );
        expect(
            diag.filter(
                (d) => d.code === SepticDiagnosticCode.duplicatedAttribute,
            ).length,
        ).to.equal(2);
    });
    it("Expect diagnostics for duplicated attributes with different prefix", () => {
        const text = `
            Mvr: Test
            HighOn= 10
            HighOff= 12
        `;
        const objectDoc =
            SepticMetaInfoProvider.getInstance().getObjectDocumentation("Mvr");
        const objectInfo =
            SepticMetaInfoProvider.getInstance().getObject("Mvr");
        const cnfg = parseSepticForTest(text);
        const diag = validateObject(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectDoc!,
            objectInfo,
        );
        expect(
            diag.filter(
                (d) => d.code === SepticDiagnosticCode.duplicatedAttribute,
            ).length,
        ).to.equal(2);
    });
    it("Expect no diagnostics for non duplicated attributes", () => {
        const text = `
            Mvr: Test
            Text1= ""
            Text2= ""
        `;
        const objectDoc =
            SepticMetaInfoProvider.getInstance().getObjectDocumentation("Mvr");
        const objectInfo =
            SepticMetaInfoProvider.getInstance().getObject("Mvr");
        const cnfg = parseSepticForTest(text);
        const diag = validateObject(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectDoc!,
            objectInfo,
        );
        expect(
            diag.filter(
                (d) => d.code === SepticDiagnosticCode.duplicatedAttribute,
            ).length,
        ).to.equal(0);
    });
});

describe("Test validation of attribute data type", () => {
    const createAttrDoc = (
        datatype: string,
        enums: string[],
    ): SepticAttributeDocumentation => {
        return {
            description: "",
            dataType: datatype,
            enums: enums,
            list: false,
            calc: false,
            noCnfg: false,
            basename: "",
            name: "",
            tags: [],
            default: [""],
            snippet: "",
            noSnippet: false,
        };
    };
    it("Check valid bitmask", () => {
        const attrValue = new SepticAttributeValue(
            "10000",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit5", [])),
        ).to.equal(true);
    });
    it("Check valid bitmask", () => {
        const attrValue = new SepticAttributeValue(
            "0000000000000000000010000000001",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit31", [])),
        ).to.equal(true);
    });
    it("Check valid bitmask lower limit", () => {
        const attrValue = new SepticAttributeValue(
            "0",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit4", [])),
        ).to.equal(true);
    });
    it("Check valid bitmask exact length", () => {
        const attrValue = new SepticAttributeValue(
            "0000",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit4", [])),
        ).to.equal(true);
    });
    it("Check invalid bitmask upper limit", () => {
        const attrValue = new SepticAttributeValue(
            "00001",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit4", [])),
        ).to.equal(false);
    });
    it("Check invalid bitmask", () => {
        const attrValue = new SepticAttributeValue(
            "2000",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("bit4", [])),
        ).to.equal(false);
    });
    it("Check valid int", () => {
        const attrValue = new SepticAttributeValue(
            "1",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("int", [])),
        ).to.equal(true);
    });
    it("Check invalid int", () => {
        const attrValue = new SepticAttributeValue(
            "1.1",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("int", [])),
        ).to.equal(false);
    });
    it("Check invalid int", () => {
        const attrValue = new SepticAttributeValue(
            "1e+10",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("int", [])),
        ).to.equal(false);
    });
    it("Check valid float", () => {
        const attrValue = new SepticAttributeValue(
            "1e+10",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("float", [])),
        ).to.equal(true);
    });
    it("Check invalid float", () => {
        const attrValue = new SepticAttributeValue(
            "Test",
            SepticTokenType.string,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("float", [])),
        ).to.equal(false);
    });
    it("Check valid string", () => {
        const attrValue = new SepticAttributeValue(
            "Test",
            SepticTokenType.string,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("string", [])),
        ).to.equal(true);
    });
    it("Check invalid string", () => {
        const attrValue = new SepticAttributeValue(
            "1.1",
            SepticTokenType.numeric,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("string", [])),
        ).to.equal(false);
    });
    it("Check valid enum", () => {
        const attrValue = new SepticAttributeValue(
            "TEST",
            SepticTokenType.identifier,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("enum", ["TEST"])),
        ).to.equal(true);
    });
    it("Check invalid enum", () => {
        const attrValue = new SepticAttributeValue(
            "TES",
            SepticTokenType.identifier,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("enum", ["TEST"])),
        ).to.equal(false);
    });
    it("Check jinja expression", () => {
        const attrValue = new SepticAttributeValue(
            "{{ TEST }}",
            SepticTokenType.jinjaExpression,
        );
        expect(
            checkAttributeDataType(
                attrValue,
                createAttrDoc("string", ["TEST"]),
            ),
        ).to.equal(true);
    });
    it("Check jinja expression", () => {
        const attrValue = new SepticAttributeValue(
            "{{ TEST }}",
            SepticTokenType.jinjaExpression,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("int", [])),
        ).to.equal(true);
    });
    it("Check variable datatype", () => {
        const attrValue = new SepticAttributeValue(
            "Test",
            SepticTokenType.identifier,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("variable", [])),
        ).to.equal(true);
    });
    it("Check variable datatype", () => {
        const attrValue = new SepticAttributeValue(
            `"Test"`,
            SepticTokenType.string,
        );
        expect(
            checkAttributeDataType(attrValue, createAttrDoc("variable", [])),
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
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("SopcMvr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
    it("Expect no  diagnostics for correct reference in identifier", () => {
        const text = `
            SopcMvr: MvrTest

            Mvr: MvrTest       
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("SopcMvr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for missing reference in attr list", () => {
        const text = `
            Mvr: TestMvr

            MvrList: Test
            Mvrs= 1 "MvrTest"       
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[1]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.missingReference);
    });
    it("Expect no diagnostics for corret reference in attr list", () => {
        const text = `
            Mvr: TestMvr

            MvrList: Test
            Mvrs= 1 "TestMvr"       
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[1]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for unused evr", () => {
        const text = `
            Evr: TestEvr
            UserInput= OFF    
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("Evr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.unusedEvr);
    });
    it("Expect no diagnostics for evr with user input enabled", () => {
        const text = `
            Evr: TestEvr
            UserInput= DOUBLE    
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("Evr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for evr used in calc", () => {
        const text = `
            Evr: TestEvr
            UserInput= OFF 
            
            CalcPvr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("Evr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for evr used in calc", () => {
        const text = `
            Evr: TestEvr
            UserInput= OFF 
            
            CalcPvr: Test
            Alg= "TestEvr"
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("Evr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for xvrs with duplicate names", () => {
        const text = `
            Evr: TestEvr
            
            Tvr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(1);
    });
    it("Expect diagnostics for sopcxvrs with duplicate names", () => {
        const text = `
            SopcEvr: TestEvr
            
            SopcTvr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(1);
    });
    it("Expect diagnostics for uaxvrs with duplicate names", () => {
        const text = `
            UAEvr: TestEvr
            
            UATvr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(1);
    });
    it("Expect no duplicate diagnostics for sopcxvr and xvr with same name", () => {
        const text = `
            SopcEvr: TestEvr
            
            Evr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(0);
    });
    it("Expect no duplicate diagnostics for sopcxvr and uaxvr with same name", () => {
        const text = `
            SopcEvr: TestEvr
            
            UAEvr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(0);
    });
    it("Expect no diagnostics for sopcxvr without identifier", () => {
        const text = `
            SopcEvr: 
            
            Evr: TestEvr
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("MvrList");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(0);
    });
    it("Expect diagnostics for duplicate calcpvr", () => {
        const text = `
            CalcPvr:  Test 
            
            CalcPvr: Test
		`;
        const cnfg = parseSepticForTest(text);
        const objectInfo = metaInfoProvider.getObject("CalcPvr");
        const diag = validateObjectReferences(
            cnfg.objects[0]!,
            cnfg.doc,
            cnfg,
            objectInfo!,
        );
        const diagFilterd = diag.filter(
            (d) => d.code === SepticDiagnosticCode.duplicate,
        );
        expect(diagFilterd.length).to.equal(1);
    });
});

describe("Test validation of object structure", () => {
    it("Expect no diagnostics for correct structure", () => {
        const text = `
            CalcModl: TestModl

            CalcPvr: Test
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[1]!, cnfg.doc);
        expect(diag.length).to.equal(0);
    });

    it("Expect diagnostics for incorrect structure", () => {
        const text = `
        CalcPvr: Test

        CalcModl: TestModl
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingParentObject,
        );
    });

    it("Expect diagnostics for incorrect structure", () => {
        const text = `
        CalcPvr: Test

        CalcModl: TestModl
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[1]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.missingParentObject,
        );
    });

    it("Expect diagnostics for unexpected object on same level structure", () => {
        const text = `
        SmpcAppl: Test1

        DmmyAppl: Test2

        Mvr: Test3
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[2]!, cnfg.doc);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(
            SepticDiagnosticCode.invalidParentObject,
        );
    });

    it("Expect no diagnostics for object on same level structure", () => {
        const text = `
        DmmyAppl: Test2

        SmpcAppl: Test1

        Mvr: Test3
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[2]!, cnfg.doc);
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
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[3]!, cnfg.doc);
        expect(diag.length).to.equal(0);
    });

    it("Expect no diagnostics for correct root object", () => {
        const text = `
        System: Test1
        "       
		`;
        const cnfg = parseSepticForTest(text);
        cnfg.updateObjectParents();
        const diag = validateObjectParent(cnfg.objects[0]!, cnfg.doc);
        expect(diag.length).to.equal(0);
    });
});

describe("Test validation of comments", () => {
    it("Expect diagnostics for invalid line comment", () => {
        const text = `
            //Test
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidComment);
    });
    it("Expect no diagnostics for valid line comment", () => {
        const text = `
            // Test
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for valid line comment", () => {
        const text = `
            //
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect diagnostics for invalid block comment", () => {
        const text = `
            /*Test */
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidComment);
    });
    it("Expect diagnostics for invalid block comment", () => {
        const text = `
            /* Test*/
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(1);
        expect(diag[0]!.code).to.equal(SepticDiagnosticCode.invalidComment);
    });
    it("Expect no diagnostics for valid block comment", () => {
        const text = `
            /* Test */
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for valid block comment", () => {
        const text = `
            /* */
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Expect no diagnostics for valid block comment", () => {
        const text = `
        /*
        CalcModl:      CalcModlName
               Text1=  ""
               Text2=  ""
      
        CalcPvr:       Var2
               Text1=  ""
               Text2=  ""
                 Alg=  "Test1"
      
        CalcPvr:       Def
               Text1=  ""
               Text2=  ""
                 Alg=  "Var2/selectvalue(Var2.Test)"
      
      */
		`;
        const cnfg = parseSepticForTest(text);
        const diag = validateComments(cnfg);
        expect(diag.length).to.equal(0);
    });
});
