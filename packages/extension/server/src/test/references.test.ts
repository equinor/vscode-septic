import { expect } from "chai";
import {
    getDefinition,
    getDeclaration,
    getReferences,
} from "../language-service/referenceProvider";
import { parseSepticForTest } from "./util";
import { Position } from "vscode-languageserver";

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
