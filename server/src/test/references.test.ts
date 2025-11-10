import { expect } from "chai";
import {
    getDefinition,
    getDeclaration,
    getReferences,
} from "../language-service/referenceProvider";
import { Attribute, AttributeValue, extractReferencesFromObj, Identifier, SepticObject, SepticTokenType } from "../septic";
import { parseSepticForTest } from "./util";
import { Position } from 'vscode-languageserver';

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
        const cnfg = parseSepticForTest(text);
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
        const cnfg = parseSepticForTest(text);
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
        const cnfg = parseSepticForTest(text);
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
        const cnfg = parseSepticForTest(text);
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
    const cnfg = parseSepticForTest(text);
    it("Get Definition SopcMvr", () => {
        const position = Position.create(1, 11);
        const result = getDefinition(position, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Definition Mvr: ", () => {
        const position = Position.create(5, 7);
        const result = getDefinition(position, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Definition Xvr", () => {
        const position = Position.create(7, 7);
        const result = getDefinition(position, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Definition CalcPvr", () => {
        const position = Position.create(15, 12);
        const result = getDefinition(position, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Definition Xvr", () => {
        const position = Position.create(16, 13);
        const result = getDefinition(position, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Expect no definition when outside refs", () => {
        const position = Position.create(0, 1);
        const result = getDefinition(position, cnfg, cnfg);
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
    const cnfg = parseSepticForTest(text);
    it("Get Declaration SopcMvr", () => {
        const position = Position.create(1, 11);
        const result = getDeclaration(position, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Declaration Mvr Var 1", () => {
        const position = Position.create(3, 7);
        const result = getDeclaration(position, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Get Declaration CalcPvr", () => {
        const position = Position.create(15, 12);
        const result = getDeclaration(position, cnfg, cnfg);
        expect(result.length).to.equal(0);
    });
    it("Get Declaration Alg", () => {
        const position = Position.create(16, 13);
        const result = getDeclaration(position, cnfg, cnfg);
        expect(result.length).to.equal(1);
    });
    it("Expect no declaration when not in ref", () => {
        const position = Position.create(0, 1);
        const result = getDeclaration(position, cnfg, cnfg);
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
    const cnfg = parseSepticForTest(text);
    it("Get References SopcXvr", () => {
        const position = Position.create(1, 11);
        const result = getReferences(position, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Get References Mvr Var1", () => {
        const position = Position.create(3, 7);
        const result = getReferences(position, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Get References Cvr Var2", () => {
        const position = Position.create(5, 7);
        const result = getReferences(position, cnfg, cnfg);
        expect(result.length).to.equal(3);
    });
    it("Get References CalcPvr", () => {
        const position = Position.create(15, 12);
        const result = getReferences(position, cnfg, cnfg);
        expect(result.length).to.equal(3);
    });
    it("Get References Alg", () => {
        const position = Position.create(16, 13);
        const result = getReferences(position, cnfg, cnfg);
        expect(result.length).to.equal(4);
    });
    it("Expect no references when outside", () => {
        const position = Position.create(0, 1);
        const result = getReferences(position, cnfg, cnfg);
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