import {
    getDefinition,
    getDeclaration,
    getReferences,
} from "../src/language-service/referenceProvider";
import { parseSeptic } from "../src/septic";
import { MockDocument } from "./util";

describe("Test extraction of refs from config file", () => {
    test("Test (sopc)xvrs", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Dvr: Var3

			System: Var1

			SopcProc: Var2
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).toBe(2);
        expect(cnfg.getXvrRefs("Var2")?.length).toBe(1);
        expect(cnfg.getXvrRefs("Var3")?.length).toBe(1);
    });

    test("Test xvrs + Calcs", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Evr: CalcVar

			CalcPvr: CalcVar
				Alg= "Var1 + Var2 - abs(Var2)"

		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).toBe(3);
        expect(cnfg.getXvrRefs("Var2")?.length).toBe(3);
        expect(cnfg.getXvrRefs("CalcVar")?.length).toBe(2);
    });

    test("Objects containg list of refs", () => {
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

        const cnfg = parseSeptic(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).toBe(3);
        expect(cnfg.getXvrRefs("Var2")?.length).toBe(2);
        expect(cnfg.getXvrRefs("Var3")?.length).toBe(2);
    });

    test("Objects containg ref in identifer", () => {
        const text = `
			SopcMvr: Var1

			Mvr: Var1
			
			Cvr: Var2

			Mvr: Var3

			XvrPlot: Var2
		`;

        const doc = new MockDocument(text);

        const cnfg = parseSeptic(doc.getText());
        expect(cnfg.getXvrRefs("Var1")?.length).toBe(2);
        expect(cnfg.getXvrRefs("Var2")?.length).toBe(2);
        expect(cnfg.getXvrRefs("Var3")?.length).toBe(1);
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

    const cnfg = parseSeptic(doc.getText());
    test("Get Definition SopcXvr", () => {
        const offset = 15;
        let result = getDefinition(offset, cnfg, doc);
        expect(result.length).toBe(1);
    });
    test("Get Definition Xvr", () => {
        const offset = 29;
        let result = getDefinition(offset, cnfg, doc);
        expect(result.length).toBe(0);
    });
    test("Get Definition Xvr", () => {
        const offset = 46;
        let result = getDefinition(offset, cnfg, doc);
        expect(result.length).toBe(0);
    });
    test("Get Definition CalcPvr", () => {
        const offset = 158;
        let result = getDefinition(offset, cnfg, doc);
        expect(result.length).toBe(1);
    });
    test("Get Definition Xvr", () => {
        const offset = 190;
        let result = getDefinition(offset, cnfg, doc);
        expect(result.length).toBe(1);
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

    const cnfg = parseSeptic(doc.getText());
    test("Get Declaration SopcXvr", () => {
        const offset = 15;
        let result = getDeclaration(offset, cnfg, doc);
        expect(result.length).toBe(0);
    });
    test("Get Declaration Xvr", () => {
        const offset = 29;
        let result = getDeclaration(offset, cnfg, doc);
        expect(result.length).toBe(1);
    });
    test("Get Declaration CalcPvr", () => {
        const offset = 158;
        let result = getDeclaration(offset, cnfg, doc);
        expect(result.length).toBe(0);
    });
    test("Get Declaration Alg", () => {
        const offset = 190;
        let result = getDeclaration(offset, cnfg, doc);
        expect(result.length).toBe(1);
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

    const cnfg = parseSeptic(doc.getText());
    test("Get References SopcXvr", () => {
        const offset = 15;
        let result = getReferences(offset, cnfg, doc);
        expect(result.length).toBe(4);
    });
    test("Get References Xvr", () => {
        const offset = 29;
        let result = getReferences(offset, cnfg, doc);
        expect(result.length).toBe(4);
    });
    test("Get References Xvr", () => {
        const offset = 46;
        let result = getReferences(offset, cnfg, doc);
        expect(result.length).toBe(3);
    });
    test("Get References CalcPvr", () => {
        const offset = 158;
        let result = getReferences(offset, cnfg, doc);
        expect(result.length).toBe(3);
    });
    test("Get References Alg", () => {
        const offset = 190;
        let result = getReferences(offset, cnfg, doc);
        expect(result.length).toBe(4);
    });
});
