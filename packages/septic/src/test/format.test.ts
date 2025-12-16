import { TextDocument } from "vscode-languageserver-textdocument";
import { compareFiles, loadFile, parseSepticForTest } from "./util";
import {
    jinjaForRegex,
    jinjaForEndRegex,
    jinjaIfRegex,
    jinjaIfEndRegex,
    startFormattingRegex,
    stopFormattingRegex,
    lineCommentRegex,
    SepticCnfgFormatter,
} from "../formatter";
import { expect } from "chai";

describe("for regex test", () => {
    const regex = jinjaForRegex;
    it("matches valid", () => {
        expect(regex.test("{% for well in wells %}")).to.equal(true);
        expect(regex.test("{%- for well in wells %}")).to.equal(true);
        expect(regex.test("{% for well %}")).to.equal(true);
        expect(regex.test("{% for %}")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("{# for %}")).to.equal(false);
        expect(regex.test("{%for%}")).to.equal(false);
        expect(regex.test("{%-for-%}")).to.equal(false);
        expect(regex.test("{% fo %}")).to.equal(false);
    });
});

describe("endfor regex test", () => {
    const regex = jinjaForEndRegex;
    it("matches valid", () => {
        expect(regex.test("{% endfor %}")).to.equal(true);
        expect(regex.test("{%   endfor   %}")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("{# endfor %}")).to.equal(false);
        expect(regex.test("{% endfo %}")).to.equal(false);
    });
});

describe("if regex test", () => {
    const regex = jinjaIfRegex;
    it("matches valid", () => {
        expect(regex.test("{% if something %}")).to.equal(true);
        expect(regex.test("{%- if something %}")).to.equal(true);
        expect(regex.test("{% if   %}")).to.equal(true);
    });

    it("does not match invalid for", () => {
        expect(regex.test("{% ifsomething %}")).to.equal(false);
        expect(regex.test("{%if something %}")).to.equal(false);
        expect(regex.test("{# if something %}")).to.equal(false);
    });
});

describe("end if regex test", () => {
    const regex = jinjaIfEndRegex;
    it("matches valid", () => {
        expect(regex.test("{% endif %}")).to.equal(true);
        expect(regex.test("{%- endif %}")).to.equal(true);
        expect(regex.test("{%    endif    %}")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("{%endif %}")).to.equal(false);
        expect(regex.test("{# endif %}")).to.equal(false);
        expect(regex.test("{% endi %}")).to.equal(false);
    });
});

describe("stop formatting regex test", () => {
    const regex = stopFormattingRegex;
    it("matches valid", () => {
        expect(regex.test("{# format:off #}")).to.equal(true);
        expect(regex.test("{#    format:off #}")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("{# formatoff #}")).to.equal(false);
        expect(regex.test("{#formatoff #}")).to.equal(false);
        expect(regex.test("{% format:off #}")).to.equal(false);
    });
});

describe("start formatting regex test", () => {
    const regex = startFormattingRegex;
    it("matches valid", () => {
        expect(regex.test("{# format:on #}")).to.equal(true);
        expect(regex.test("{#    format:on #}")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("{# formaton #}")).to.equal(false);
        expect(regex.test("{#formaton #}")).to.equal(false);
        expect(regex.test("{% format:on #}")).to.equal(false);
    });
});

describe("line comment regex test", () => {
    const regex = lineCommentRegex;
    it("matches valid", () => {
        expect(regex.test("// Test")).to.equal(true);
        expect(regex.test("/*\nTest\n*/")).to.equal(true);
        expect(regex.test("/*\nTest\n*/ ")).to.equal(true);
        expect(regex.test("{#\nTest\n#} ")).to.equal(true);
    });

    it("does not match invalid", () => {
        expect(regex.test("//Test")).to.equal(false);
        expect(regex.test("/* Test */bs")).to.equal(false);
        expect(regex.test("{# Test #}bs")).to.equal(false);
    });
});

describe("Test formatting", () => {
    it("Expect correct formatting of lists", () => {
        const content = loadFile("formatting/listOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/listExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of attributes", () => {
        const content = loadFile("formatting/attributesOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/attributesExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting in case of content that disables formatting", () => {
        const content = loadFile("formatting/disabledFormattingOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile(
            "formatting/disabledFormattingExpected.cnfg",
        );
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of objects", () => {
        const content = loadFile("formatting/objectsOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/objectsExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting when format:off without ending statement", () => {
        const content = loadFile("formatting/formatoffOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/formatoffExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect no formatting of incomplete jinja", () => {
        const content = loadFile("formatting/uncompletedJinjaOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile(
            "formatting/uncompletedJinjaExpected.cnfg",
        );
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of calcs with jinja", () => {
        const content = loadFile("formatting/calcsOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/calcsExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
    it("Expect correct formatting of line comments with jinja", () => {
        const content = loadFile("formatting/lineCommentOriginal.cnfg");
        const doc = TextDocument.create("", "", 0, content);
        const cnfg = parseSepticForTest(doc.getText());
        const formatter = new SepticCnfgFormatter(cnfg);
        const edits = formatter.format();
        const formattedContent = TextDocument.applyEdits(doc, edits);
        const expectedContent = loadFile("formatting/lineCommentExpected.cnfg");
        compareFiles(expectedContent, formattedContent);
    });
});
