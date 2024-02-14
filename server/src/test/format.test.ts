import { TextDocument } from "vscode-languageserver-textdocument";
import { compareFiles, loadFile } from "./util";
import { parseSeptic } from "../septic";
import { SepticCnfgFormatter } from "../language-service/formatProvider";

describe("Test formatting", () => {
    it("Expect correct formatting of lists", () => {
        const content = loadFile("formatting/listOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/listExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of attributes", () => {
        const content = loadFile("formatting/attributesOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/attributesExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting in case of content that disables formatting", () => {
        const content = loadFile("formatting/disabledFormattingOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile(
            "formatting/disabledFormattingExpected.cnfg"
        );
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of objects", () => {
        const content = loadFile("formatting/objectsOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/objectsExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting when format:off without ending statement", () => {
        const content = loadFile("formatting/formatoffOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/formatoffExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect no formatting of incomplete jinja", () => {
        const content = loadFile("formatting/uncompletedJinjaOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSeptic(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/uncompletedJinjaExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
});
