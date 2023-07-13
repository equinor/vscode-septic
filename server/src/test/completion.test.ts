import { describe } from "mocha";
import { SepticMetaInfoProvider, parseSeptic } from "../septic";
import {
    getCalcCompletion,
    getCompletion,
    getObjectCompletion,
} from "../language-service/completionProvider";
import { CompletionItemKind, Position, TextEdit } from "vscode-languageserver";
import { expect } from "chai";
import { TextDocument } from "vscode-languageserver-textdocument";

describe("Test completion of identifier", () => {
    it("Completion of SopcCvr identifier for Cvr", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 6));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("Completion of SopcMvr identifier for Mvr", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nMvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 6));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestMvr");
    });
    it("Completion of Mvr identifier for SopcMvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nSopcMvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestMvr");
    });
    it("Completion of Cvr identifier for SopcCvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nSopcCvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("Completion of Cvr & Mvr identifiers for CalcPvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nCalcPvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(2);
        expect(compItems[0].label).to.equal("TestMvr");
        expect(compItems[1].label).to.equal("TestCvr");
    });
    it("Completion of Cvr with initial value", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr:   T     \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 8));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("No Completion for Cvr with initial existing identifier", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr: Test     \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 12));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(0);
    });
});

describe("Test completion of object attributes", () => {
    it("Completion don't suggest identifiers", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""\n     \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 2));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(0);
    });
    it("Completion don't suggest completion when inside existing attribute", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""\nAttr= 2 " " " "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 8));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(0);
    });
    it("Completion don't suggest existing attributes", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""\n  \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 1));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        expect(compItems.find((item) => item.label === "Text1")).to.equal(
            undefined
        );
    });
    it("Completion suggest all attributes when none exists", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\n   \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 1));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        const mvrDoc = metaInfoProvider.getObjectDocumentation("Mvr");
        expect(compItems.length).to.equal(mvrDoc!.attributes.length);
    });
    it("Completion item is inserted on same line when completing on empty line", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\n   \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 1));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        const insertText = compItems[0].textEdit?.newText!;
        expect(/^\n/.test(insertText)).to.equal(false);
    });
    it("Completion item is inserted on same line when completing on empty line with start", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nTe   \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 2));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        const insertText = compItems[0].textEdit?.newText!;
        expect(/^\n/.test(insertText)).to.equal(false);
    });
    it("Completion item is inserted on new line when completing on line with existing attr", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""     \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        const insertText = compItems[0].textEdit?.newText!;
        expect(/^\n/.test(insertText)).to.equal(true);
    });
    it("Completion item is overwrites entire completion text", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= "" Text2    \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 15));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        let textEdit = compItems[0].textEdit as TextEdit;
        expect(textEdit.range.start.character).to.equal(10);
    });
});

describe("Test calc completion", () => {
    it("Completion suggest Xvrs", () => {
        const text = `Mvr: TestMvr\nEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(2);
    });
    it("Completion don't suggest SopcXvrs", () => {
        const text = `SopcMvr: TestMvr\nSopcEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(0);
    });
    it("Completion suggest all available functions", () => {
        const text = `SopcMvr: TestMvr\nSopcEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, cnfg);
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        const calcs = metaInfoProvider.getCalcs();
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Function
            ).length
        ).to.equal(calcs.length);
    });
});

describe("Test completion logic", () => {
    it("Expect to get completion items relevant for algs when inside alg", () => {
        const text = `Mvr:   TestMvr\nText1= ""  \nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCompletion(cnfg, offset, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Function
            ).length
        ).to.greaterThan(0);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Property
            ).length
        ).to.equal(0);
    });
    it("Expect to get completion items relevant for object when outside alg", () => {
        const text = `Mvr:   TestMvr\nText1= ""  \nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSeptic(doc.getText());
        const offset = doc.offsetAt(Position.create(1, 10));
        const compItems = getCompletion(cnfg, offset, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Function
            ).length
        ).to.equal(0);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Property
            ).length
        ).to.greaterThan(0);
    });
});
