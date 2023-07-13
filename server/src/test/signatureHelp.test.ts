import { describe } from "mocha";
import { loadFile } from "./util";
import { parseSeptic } from "../septic";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Position } from "vscode-languageserver";
import { getSignatureHelp } from "../language-service/signatureHelpProvider";
import { expect } from "chai";

describe("Test active param", () => {
    it("Expect first param in standard arity function", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 24));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(4);
        expect(signature.activeParameter).to.equal(0);
    });
    it("Expect second param in standard arity function", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 28));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(4);
        expect(signature.activeParameter).to.equal(1);
    });
    it("Expect third param in standard arity function", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 31));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(4);
        expect(signature.activeParameter).to.equal(2);
    });
    it("Expect fourth param in standard arity function with optional", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 34));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(4);
        expect(signature.activeParameter).to.equal(3);
    });
    it("Expect last param when outside the number of defined params", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 37));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(4);
        expect(signature.activeParameter).to.equal(3);
    });
    it("Expect second param in function with infinite even numbers", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(13, 34));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(2);
        expect(signature.activeParameter).to.equal(1);
    });
    it("Expect second param in function with infinite even numbers", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(13, 36));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(2);
        expect(signature.activeParameter).to.equal(1);
    });
    it("Expect second param in function with infinite even numbers", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(13, 40));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(2);
        expect(signature.activeParameter).to.equal(1);
    });
    it("Expect second param in function with infinite even numbers", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(13, 43));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(signature.parameters!.length).to.equal(2);
        expect(signature.activeParameter).to.equal(1);
    });
});

describe("Test selection of relevant calc", () => {
    it("Expect to select second parameter in  outer when outside inner", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(8, 39));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(/\bif\b/.test(signature.label)).to.equal(true);
        expect(signature.activeParameter).to.equal(1);
    });
    it("Expect to select first parameter in inner when inside inner", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(8, 35));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(1);
        const signature = signHelp.signatures[0];
        expect(/\band\b/.test(signature.label)).to.equal(true);
        expect(signature.activeParameter).to.equal(0);
    });
});

describe("Test that it return empty when not relevant", () => {
    it("Expect to return empty when outside alg", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(2, 18));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(0);
    });
    it("Expect to return empty when outside calc", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(3, 42));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(0);
    });
    it("Expect to return empty when inside undocumented calc", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(18, 29));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(0);
    });
    it("Expect to return empty when inside unparsable alg", () => {
        const content = loadFile("signatureHelp.cnfg");
        const cnfg = parseSeptic(content);
        const doc = TextDocument.create("", "", 0, content);
        const offset = doc.offsetAt(Position.create(23, 33));
        const signHelp = getSignatureHelp(cnfg, offset);
        expect(signHelp.signatures.length).to.equal(0);
    });
});
