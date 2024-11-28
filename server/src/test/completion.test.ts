import { describe } from "mocha";
import { SepticMetaInfoProvider, parseSepticSync } from "../septic";
import {
    getCalcCompletion,
    getCalcPublicPropertiesCompletion,
    getCompletion,
    getObjectCompletion,
} from "../language-service/completionProvider";
import { CompletionItemKind, Position, TextEdit } from "vscode-languageserver";
import { expect } from "chai";
import { TextDocument } from "vscode-languageserver-textdocument";
import { loadFile } from "./util";

describe("Test completion of identifier", () => {
    it("Completion of SopcCvr identifier for Cvr", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 6));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("Completion of UACvr identifier for Cvr", () => {
        const text = "SopcMvr: TestMvr\nUACvr: TestCvr\nCvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 6));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("Completion of SopcMvr identifier for Mvr", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nMvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 6));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestMvr");
    });
    it("Completion of Mvr identifier for SopcMvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nSopcMvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestMvr");
    });
    it("Completion of Mvr identifier for UAMvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nUAMvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 8));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestMvr");
    });
    it("Completion of Cvr identifier for SopcCvr", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nSopcCvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("Completion of identifiers for CalcPvr", () => {
        const text =
            "Evr: TestEvr\nMvr: TestMvr\nCvr: TestCvr\nCalcPvr:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestEvr");
    });
    it("Completion of Cvr & Mvr identifiers for non Xvr object with identifier reference", () => {
        const text = "Mvr: TestMvr\nCvr: TestCvr\nXvrPlot:        \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(2);
        expect(compItems[0].label).to.equal("TestMvr");
        expect(compItems[1].label).to.equal("TestCvr");
    });
    it("Completion of Cvr with initial value", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr:   T     \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 8));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.equal(1);
        expect(compItems[0].label).to.equal("TestCvr");
    });
    it("No Completion for Cvr with initial existing identifier", () => {
        const text = "SopcMvr: TestMvr\nSopcCvr: TestCvr\nCvr: Test     \n";
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 12));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(
            compItems.filter((item) => {
                return item.kind === CompletionItemKind.Variable;
            }).length
        ).to.equal(0);
    });
});

describe("Test completion of object attributes", () => {
    it("Completion don't suggest identifiers", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""\n     \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
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
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 8));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Property
            ).length
        ).to.equal(0);
    });
    it("Completion don't suggest existing attributes", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""\n  \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
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
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 1));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        const mvrDoc = metaInfoProvider.getObjectDocumentation("Mvr");
        const compItemsFiltered = compItems.filter(
            (item) => item.kind !== CompletionItemKind.Snippet
        );
        expect(compItemsFiltered.length).to.equal(mvrDoc!.attributes.length);
    });
    it("Completion item is inserted on same line when completing on empty line", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\n   \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 1));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        const textEdit = compItems[0].textEdit;
        if (textEdit) {
            const insertText = textEdit.newText;
            expect(/^\n/.test(insertText)).to.equal(false);
        }
    });
    it("Completion item is inserted on same line when completing on empty line with start", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nTe   \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 2));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        expect(compItems.length).to.greaterThan(0);
        const textEdit = compItems[0].textEdit;
        if (textEdit) {
            const insertText = textEdit.newText;
            expect(/^\n/.test(insertText)).to.equal(false);
        }
    });
    it("Completion item is inserted on new line when completing on line with existing attr", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= ""     \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 10));
        let compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        compItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Property
        );
        expect(compItems.length).to.greaterThan(0);
        const insertText = compItems[0].textEdit?.newText;
        if (insertText) {
            expect(/^\n/.test(insertText)).to.equal(true);
        }

    });
    it("Completion item is overwrites entire completion text", () => {
        const text = `SopcMvr: TestMvr\nMvr:   TestMvr\nText1= "" Text2    \n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(2, 15));
        let compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        compItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Property
        );
        expect(compItems.length).to.greaterThan(0);
        const textEdit = compItems[0].textEdit as TextEdit;
        expect(textEdit.range.start.character).to.equal(10);
    });
});

describe("Test completion of attribute with references to xvrs", () => {
    it("Expect Xvrs for attribute that references Xvrs", () => {
        const content = loadFile("completionAttrRefs.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(13, 28));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const variableCompItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Variable
        );
        expect(variableCompItems.length).to.equal(2);
    });
    it("Expect Mvrs for attribute that references Mvrs", () => {
        const content = loadFile("completionAttrRefs.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(17, 19));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const variableCompItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Variable
        );
        expect(variableCompItems.length).to.equal(1);
        expect(variableCompItems[0].label).to.equal("MvrTest");
    });
    it("Expect completion of xvr in-between existing attr values", () => {
        const content = loadFile("completionAttrRefs.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(27, 20));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const variableCompItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Variable
        );
        expect(variableCompItems.length).to.equal(2);
    });
    it("Expect no completion of xvr non-reference attribute", () => {
        const content = loadFile("completionAttrRefs.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(20, 20));
        const compItems = getObjectCompletion(offset, cnfg, cnfg, doc);
        const variableCompItems = compItems.filter(
            (item) => item.kind === CompletionItemKind.Variable
        );
        expect(variableCompItems.length).to.equal(0);
    });
});

describe("Test calc completion", () => {
    it("Completion suggest Xvrs", () => {
        const text = `Mvr: TestMvr\nEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(2);
    });
    it("Completion suggest Xvrs and Calcs in incomplete alg", () => {
        const text = `Mvr: TestMvr\nEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "(TestMvr + T  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 17));
        const compItems = getCalcCompletion(offset, cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(2);
    });
    it("Completion don't suggest SopcXvrs", () => {
        const text = `SopcMvr: TestMvr\nSopcEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Variable
            ).length
        ).to.equal(0);
    });
    it("Completion suggest all available functions", () => {
        const text = `SopcMvr: TestMvr\nSopcEvr:   TestEvr\nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(3, 6));
        const compItems = getCalcCompletion(offset, cnfg, doc, cnfg);
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        const calcs = metaInfoProvider.getCalcs();
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Function
            ).length
        ).to.equal(calcs.length);
    });
});

describe("Test property completion in alg", () => {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    it("Expect completion of Mvr public properties", () => {
        const content = loadFile("completion/publicProperties.cnfg");
        const doc = TextDocument.create("test.cnfg", "septic", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(6, 26));
        const compItems = getCalcPublicPropertiesCompletion(offset, cnfg, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Property
            ).length
        ).to.equal(
            metaInfoProvider.getObjectDocumentation("Mvr")?.publicAttributes
                .length
        );
    });
    it("Expect no completion item for unknown variable", () => {
        const content = loadFile("completion/publicProperties.cnfg");
        const doc = TextDocument.create("test.cnfg", "septic", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(11, 27));
        const compItems = getCalcPublicPropertiesCompletion(offset, cnfg, cnfg);
        expect(compItems.length).to.equal(0);
    });
    it("Expect no completion item for number", () => {
        const content = loadFile("completion/publicProperties.cnfg");
        const doc = TextDocument.create("test.cnfg", "septic", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(16, 20));
        const compItems = getCalcPublicPropertiesCompletion(offset, cnfg, cnfg);
        expect(compItems.length).to.equal(0);
    });
    it("Expect no completion item for already completed variable", () => {
        const content = loadFile("completion/publicProperties.cnfg");
        const doc = TextDocument.create("test.cnfg", "septic", 0, content);
        const cnfg = parseSepticSync(doc.getText());
        const offset = doc.offsetAt(Position.create(21, 26));
        const compItems = getCalcPublicPropertiesCompletion(offset, cnfg, cnfg);
        expect(compItems.length).to.equal(0);
    });
});

describe("Test completion logic", () => {
    it("Expect to get completion items relevant for algs when inside alg", () => {
        const text = `Mvr:   TestMvr\nText1= ""  \nCalcPvr: TestCalc\nAlg= "  "\n`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(3, 6);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
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
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(1, 10);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
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


describe("Test snippet completion logic", () => {
    it("Expect to get object snippets on top of file", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(0, 1);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Snippet
            ).length
        ).to.greaterThan(0);
    });
    it("Expect to get object snippets at end of object", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(2, 9);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Snippet
            ).length
        ).to.greaterThan(0);
    });
    it("Expect to get no object snippets inside object", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(2, 0);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Snippet
            ).length
        ).to.equal(0);
    });
    it("Expect to get no object snippets inside object", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2`;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(2, 0);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.kind === CompletionItemKind.Snippet
            ).length
        ).to.equal(0);
    });
    it("Expect to get no calcpvr snippets inside dmmyappl", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2\n    `;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(6, 1);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        expect(
            compItems.filter(
                (item) => item.label === "calcpvr"
            ).length
        ).to.equal(0);
    });
    it("Expect to get children as snippets inside object", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2\n    `;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(7, 1);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        const objectHierarchy = SepticMetaInfoProvider.getInstance().getObjectHierarchy();
        const dmmyApplNode = objectHierarchy.nodes.get("DmmyAppl");
        const dmmyApplChildren = dmmyApplNode!.children.map((child) => child.toLowerCase());
        expect(
            compItems.filter(
                (item) => dmmyApplChildren.includes(item.label)
            ).length
        ).to.equal(dmmyApplChildren.length);
    });
    it("Expect to get parents as snippets inside object", () => {
        const text = `   \nDmmyAppl:  Test\nText1= ""  \nEvr: TestEvr\nText1= " "\nMeas= 2\n    `;
        const doc = TextDocument.create("test.cnfg", "septic", 0, text);
        const cnfg = parseSepticSync(doc.getText());
        const pos = Position.create(7, 1);
        const compItems = getCompletion(pos, "", cnfg, doc, cnfg);
        const objectHierarchy = SepticMetaInfoProvider.getInstance().getObjectHierarchy();
        const dmmyApplNode = objectHierarchy.nodes.get("DmmyAppl");
        const dmmyApplParents = dmmyApplNode!.parents.map((child) => child.toLowerCase());
        expect(
            compItems.filter(
                (item) => dmmyApplParents.includes(item.label)
            ).length
        ).to.equal(dmmyApplParents.length);
    });
});