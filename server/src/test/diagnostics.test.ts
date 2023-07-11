import { expect } from "chai";

import {
    validateAlgs,
    validateIdentifier,
    getDiagnostics,
    disableDiagnosticRegex,
    DiagnosticCode,
    validateObject,
    checkAttributeDataType,
} from "../language-service/diagnosticsProvider";
import {
    AttributeValue,
    SepticAttributeDocumentation,
    SepticMetaInfoProvider,
    SepticTokenType,
    parseSeptic,
} from "../septic";
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidAlg);
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidAlg);
    });
    it("Multiple expressions in alg", () => {
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
        expect(diag[0].code).to.equal(DiagnosticCode.missingReference);
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
        expect(diag[0].code).to.equal(DiagnosticCode.unknownCalc);
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidDataTypeParam);
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
        expect(diag[0].code).to.equal(
            DiagnosticCode.missingValueNonOptionalParam
        );
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfParams);
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfParams);
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidNumberOfParams);
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
        expect(diag[0].code).to.equal(
            DiagnosticCode.missingValueNonOptionalParam
        );
        expect(diag[1].code).to.equal(DiagnosticCode.invalidNumberOfParams);
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
        expect(diag[0].code).to.equal(DiagnosticCode.invalidIdentifier);
    });
    it("Error for identifier with invalid char", () => {
        const text = `
        Evr: Test***
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = validateIdentifier(cnfg.objects[0], doc);
        expect(diag.length).to.equal(1);
        expect(diag[0].code).to.equal(DiagnosticCode.invalidIdentifier);
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
        Mvr: 1234 // noqa
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Disabling diagnostics using jinja comment", () => {
        const text = `
        Mvr: 1234 {# noqa #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });

    it("Disabling diagnostics using code", () => {
        const text = `
        Mvr: 1234 {# noqa: E101 #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(0);
    });
    it("Not disabling diagnostics using empty code", () => {
        const text = `
        Mvr: 1234 {# noqa: #}
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        let diag = getDiagnostics(cnfg, doc, cnfg);
        expect(diag.length).to.equal(1);
    });
    it("Not disabling diagnostics using wrong code", () => {
        const text = `
        Mvr: 1234 {# noqa: E201 #}
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

describe("Test validation of attributes", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const mvrDoc = metaInfoProvider.getObjectDocumentation("Mvr");
    const mvrInfo = metaInfoProvider.getObject("Mvr");
    it("Validation of attribute without value", () => {
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
    it("Validation of attribute with wrong data type", () => {
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
    it("Validation of attribute with wrong data type", () => {
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
    it("Validation of attribute with wrong data type", () => {
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
    it("Validation of attribute with wrong enum value", () => {
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
    it("Validation of attribute that don't expect list", () => {
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
    it("Validation of attribute that expect list", () => {
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
    it("Validation of attribute with mismatch on list length", () => {
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

    it("Validation of attribute with wrong list indicator", () => {
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
    it("Validation of attribute with correct list", () => {
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
