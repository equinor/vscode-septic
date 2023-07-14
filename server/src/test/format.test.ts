import { TextDocument } from "vscode-languageserver-textdocument";
import { loadFile } from "./util";
import { parseSeptic } from "../septic";
import { SepticCnfgFormatter } from "../language-service/formatProvider";
import { expect } from "chai";

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
        const expectedContent = loadFile("formatting/disabledFormattingExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
	it("Expect correct formatting of document in case of comments", () => {
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
});

function compareFiles(expectedContent: string, actualContent: string) {
    const expectedLines = expectedContent.split(/\r?\n/);
    const actualLines = actualContent.split(/\r?\n/);

    for (
        let i = 0;
        i < Math.min(expectedLines.length, actualLines.length);
        i += 1
    ) {
        const e = expectedLines[i];
        const a = actualLines[i];
        expect(e, `Difference at line ${i}`).to.be.equal(a);
    }

    expect(
        actualLines.length,
        expectedLines.length > actualLines.length
            ? "Actual contains more lines than expected"
            : "Expected contains more lines than the actual"
    ).to.be.equal(expectedLines.length);
}
