import { expect } from "chai";
import {
    SepticAttribute,
    SepticAttributeValue,
    SepticIdentifier,
    SepticObject,
    SepticTokenType,
} from "../elements";
import { extractReferencesFromObj } from "../cnfg";
import { parseSepticForTest } from "./util";

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
        expect(cnfg.getReferences("Var1")?.length).to.equal(2);
        expect(cnfg.getReferences("Var2")?.length).to.equal(1);
        expect(cnfg.getReferences("Var3")?.length).to.equal(1);
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
        expect(cnfg.getReferences("Var1")?.length).to.equal(3);
        expect(cnfg.getReferences("Var2")?.length).to.equal(3);
        expect(cnfg.getReferences("CalcVar")?.length).to.equal(2);
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
        expect(cnfg.getReferences("Var1")?.length).to.equal(3);
        expect(cnfg.getReferences("Var2")?.length).to.equal(2);
        expect(cnfg.getReferences("Var3")?.length).to.equal(2);
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
        expect(cnfg.getReferences("Var1")?.length).to.equal(2);
        expect(cnfg.getReferences("Var2")?.length).to.equal(2);
        expect(cnfg.getReferences("Var3")?.length).to.equal(1);
    });
});

describe("Test getReferences", () => {
    it("Expect references from alg containing for and if", () => {
        const alg = `"1 + max({% for Wellname in wells | unpack('Wellname') %}{{ Wellname }}Pdh - 5{% if not loop.last %},{% endif %}{% endfor %}) + {{ Wellname }}Twh"`;
        const calcPvr = new SepticObject(
            "CalcPvr",
            new SepticIdentifier("Test"),
            0,
            0,
        );
        const algAttribute = new SepticAttribute("Alg");
        algAttribute.addValue(
            new SepticAttributeValue(alg, SepticTokenType.string),
        );
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(3);
        expect(refs[1]?.identifier).to.equal("{{Wellname}}Pdh");
        expect(refs[2]?.identifier).to.equal("{{Wellname}}Twh");
    });
    it("Expect no references from variable inside if", () => {
        const alg = `"1 + max(Test {% if Test %} + Something {% endif %}, 1)"`;
        const calcPvr = new SepticObject(
            "CalcPvr",
            new SepticIdentifier("Test"),
            0,
            0,
        );
        const algAttribute = new SepticAttribute("Alg");
        algAttribute.addValue(
            new SepticAttributeValue(alg, SepticTokenType.string),
        );
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(2);
        expect(refs[0]?.identifier).to.not.equal("Something");
        expect(refs[1]?.identifier).to.not.equal("Something");
    });
    it("Expect no references from alg that contain other jinja expressions", () => {
        const alg = `"1 + max(Test {% with Test = 2 %} + {{Test}}Something, 1)"`;
        const calcPvr = new SepticObject(
            "CalcPvr",
            new SepticIdentifier("Test"),
            0,
            0,
        );
        const algAttribute = new SepticAttribute("Alg");
        algAttribute.addValue(
            new SepticAttributeValue(alg, SepticTokenType.string),
        );
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(1);
    });
    it("Expect references from alg that contain other jinja expressions", () => {
        const alg = `"maxselection(6,{% for Wellname in (wells | unpack('Wellname'))[:5] %} {{ Wellname }}Priority,{% endfor %} -1,{% for Wellname in (wells | unpack('Wellname'))[:5] %} {{ Wellname }}Priority < {{ CurrentWell }}Priority,{% endfor %} 1)"`;
        const calcPvr = new SepticObject(
            "CalcPvr",
            new SepticIdentifier("Test"),
            0,
            0,
        );
        const algAttribute = new SepticAttribute("Alg");
        algAttribute.addValue(
            new SepticAttributeValue(alg, SepticTokenType.string),
        );
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(4);
        expect(refs[1]?.identifier).to.equal("{{Wellname}}Priority");
        expect(refs[1]!.location.end - refs[1]!.location.start).to.equal(
            "{{ Wellname }}Priority".length,
        );
        expect(refs[2]!.identifier).to.equal("{{Wellname}}Priority");
        expect(refs[2]!.location.end - refs[2]!.location.start).to.equal(
            "{{ Wellname }}Priority".length,
        );
        expect(refs[3]!.identifier).to.equal("{{CurrentWell}}Priority");
        expect(refs[3]!.location.end - refs[3]!.location.start).to.equal(
            "{{ CurrentWell }}Priority".length,
        );
    });
    it("Expect references from alg when there are no spaces between variable and jinja expression", () => {
        const alg = `"1{% for test in wells %}+Something{{ Test }}Y{% endfor %}+Perf"`;
        const calcPvr = new SepticObject(
            "CalcPvr",
            new SepticIdentifier("Test"),
            0,
            0,
        );
        const algAttribute = new SepticAttribute("Alg");
        algAttribute.addValue(
            new SepticAttributeValue(alg, SepticTokenType.string),
        );
        calcPvr.addAttribute(algAttribute);
        const refs = extractReferencesFromObj(calcPvr);
        expect(refs.length).to.equal(3);
        expect(refs[1]!.identifier).to.equal("Something{{Test}}Y");
        expect(refs[1]!.location.end - refs[1]!.location.start).to.equal(
            "Something{{ Test }}Y".length,
        );
        expect(refs[2]!.identifier).to.equal("Perf");
        expect(refs[2]!.location.end - refs[2]!.location.start).to.equal(
            "Perf".length,
        );
    });
});
