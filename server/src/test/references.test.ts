import { expect } from "chai";
import {
    getDefinition,
    getDeclaration,
    getReferences,
} from "../language-service/referenceProvider";
import { Attribute, AttributeValue, extractReferencesFromObj, Identifier, parseSepticSync, ReferenceType, SepticObject, SepticTokenType } from "../septic";
import { MockDocument } from "./util";

describe("Test extraction of refs from config file", () => {
    it("Test (sopc)xvrs", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Dvr: Var3

			System: Var1

			SopcProc: Var2
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).to.equal(2);
        expect(cnfg.getXvrRefs("Var2")?.length).to.equal(1);
        expect(cnfg.getXvrRefs("Var3")?.length).to.equal(1);
    });

    it("Test xvrs + Calcs", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Evr: CalcVar

			CalcPvr: CalcVar
				Alg= "Var1 + Var2 - abs(Var2)"

		`;

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).to.equal(3);
        expect(cnfg.getXvrRefs("Var2")?.length).to.equal(3);
        expect(cnfg.getXvrRefs("CalcVar")?.length).to.equal(2);
    });

    it("Objects containg list of refs", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			MvrList:
				Mvrs= 2 "Var1" "Var3"

			CvrList:
				Cvrs= 1 "Var2"
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).to.equal(3);
        expect(cnfg.getXvrRefs("Var2")?.length).to.equal(2);
        expect(cnfg.getXvrRefs("Var3")?.length).to.equal(2);
    });

    it("Objects containg ref in identifer", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			XvrPlot: Var2
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSepticSync(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).to.equal(2);
        expect(cnfg.getXvrRefs("Var2")?.length).to.equal(2);
        expect(cnfg.getXvrRefs("Var3")?.length).to.equal(1);
    });
});

describe("Test getDefinition", () => {
    const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			MvrList:
				Mvrs= 2 "Var1" "Var3"

			CvrList:
				Cvrs= 1 "Var2"

            CalcPvr: Var2
                Alg= "abs(Var1)"
		`;
    const doc = new MockDocument(text);

    const cnfg = parseSepticSync(doc.getText());
    it("Get Definition SopcXvr", () => {
        const offset = 15;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Definition Xvr", () => {
        const offset = 29;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Definition Xvr", () => {
        const offset = 46;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Definition CalcPvr", () => {
        const offset = 158;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Definition Xvr", () => {
        const offset = 190;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Expect no definition when outside refs", () => {
        const offset = 1;
        const result = getDefinition(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
});

describe("Test getDeclaration", () => {
    const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			MvrList:
				Mvrs= 2 "Var1" "Var3"

			CvrList:
				Cvrs= 1 "Var2"

            CalcPvr: Var2
                Alg= "abs(Var1)"
		`;
    const doc = new MockDocument(text);

    const cnfg = parseSepticSync(doc.getText());
    it("Get Declaration SopcXvr", () => {
        const offset = 15;
        const result = getDeclaration(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Declaration Xvr", () => {
        const offset = 29;
        const result = getDeclaration(offset, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Declaration CalcPvr", () => {
        const offset = 158;
        const result = getDeclaration(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Declaration Alg", () => {
        const offset = 190;
        const result = getDeclaration(offset, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Expect no declaration when not in ref", () => {
        const offset = 1;
        const result = getDeclaration(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
});

describe("Test getReferences", () => {
    const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			MvrList:
				Mvrs= 2 "Var1" "Var3"

			CvrList:
				Cvrs= 1 "Var2"

            CalcPvr: Var2
                Alg= "abs(Var1)"
		`;
    const doc = new MockDocument(text);

    const cnfg = parseSepticSync(doc.getText());
    it("Get References SopcXvr", () => {
        const offset = 15;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Get References Xvr", () => {
        const offset = 29;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Get References Xvr", () => {
        const offset = 46;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(3);
    });
    it("Get References CalcPvr", () => {
        const offset = 158;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(3);
    });
    it("Get References Alg", () => {
        const offset = 190;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Expect no references when outside", () => {
        const offset = 1;
        const result = getReferences(offset, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
});

describe("Test getReferences", () => {
    it("Expect references from alg containing for and if", () => {
        const alg = `"1 + max({% for Wellname in wells | unpack('Wellname') %}{{ Wellname }}Pdh - 5{% if not loop.last %},{% endif %}{% endfor %}) + {{ Wellname }}Twh"`
        const calcPvr = new SepticObject("CalcPvr", new Identifier("Test"), 0, 0);
        const algAttribute = new Attribute("Alg");
        algAttribute.addValue(new AttributeValue(alg, SepticTokenType.string));
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(3);
        expect(refs[1].identifier).to.equal("{{Wellname}}Pdh");
        expect(refs[2].identifier).to.equal("{{Wellname}}Twh");
    });
    it("Expect no references from variable inside if", () => {
        const alg = `"1 + max(Test {% if Test %} + Something {% endif %}, 1)"`
        const calcPvr = new SepticObject("CalcPvr", new Identifier("Test"), 0, 0);
        const algAttribute = new Attribute("Alg");
        algAttribute.addValue(new AttributeValue(alg, SepticTokenType.string));
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(2);
        expect(refs[0].identifier).to.not.equal("Something");
        expect(refs[1].identifier).to.not.equal("Something");
    });
    it("Expect no references from alg that contain other jinja expressions", () => {
        const alg = `"1 + max(Test {% with Test = 2 %} + {{Test}}Something, 1)"`
        const calcPvr = new SepticObject("CalcPvr", new Identifier("Test"), 0, 0);
        const algAttribute = new Attribute("Alg");
        algAttribute.addValue(new AttributeValue(alg, SepticTokenType.string));
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(1);
        expect(refs[0].type).to.equal(ReferenceType.calc);

    });
    it("Expect references from alg that contain other jinja expressions", () => {
        const alg = `"maxselection(6,{% for Wellname in (wells | unpack('Wellname'))[:5] %} {{ Wellname }}Priority,{% endfor %} -1,{% for Wellname in (wells | unpack('Wellname'))[:5] %} {{ Wellname }}Priority < {{ CurrentWell }}Priority,{% endfor %} 1)"`
        const calcPvr = new SepticObject("CalcPvr", new Identifier("Test"), 0, 0);
        const algAttribute = new Attribute("Alg");
        algAttribute.addValue(new AttributeValue(alg, SepticTokenType.string));
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(4);
        expect(refs[1].identifier).to.equal("{{Wellname}}Priority");
        expect(refs[1].location.end - refs[1].location.start).to.equal("{{ Wellname }}Priority".length);
        expect(refs[2].identifier).to.equal("{{Wellname}}Priority");
        expect(refs[2].location.end - refs[2].location.start).to.equal("{{ Wellname }}Priority".length);
        expect(refs[3].identifier).to.equal("{{CurrentWell}}Priority");
        expect(refs[3].location.end - refs[3].location.start).to.equal("{{ CurrentWell }}Priority".length);

    });
    it("Expect references from alg when there are no spaces between variable and jinja expression", () => {
        const alg = `"1{% for test in wells %}+Something{{ Test }}Y{% endfor %}+Perf"`
        const calcPvr = new SepticObject("CalcPvr", new Identifier("Test"), 0, 0);
        const algAttribute = new Attribute("Alg");
        algAttribute.addValue(new AttributeValue(alg, SepticTokenType.string));
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(3);
        expect(refs[1].identifier).to.equal("Something{{Test}}Y");
        expect(refs[1].location.end - refs[1].location.start).to.equal("Something{{ Test }}Y".length);
        expect(refs[2].identifier).to.equal("Perf");
        expect(refs[2].location.end - refs[2].location.start).to.equal("Perf".length);
    });
});