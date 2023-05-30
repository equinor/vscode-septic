import { expect } from "chai";
import {
    NUMERIC_REGEX,
    OBJECT_REGEX,
    ATTRIBUTE_REGEX,
    BLOCK_COMMENT_REGEX,
    LINE_COMMENT_REGEX,
    STRING_REGEX,
    IDENTIFIER_REGEX,
    JINJA_COMMENT_REGEX,
    JINJA_EXPRESSION_REGEX,
} from "../septic";

describe("Number regex test", () => {
    const regex = NUMERIC_REGEX;
    it("matches valid numbers", () => {
        expect(regex.test("42")).to.equal(true);
        expect(regex.test("+3.14")).to.equal(true);
        expect(regex.test("-0.5")).to.equal(true);
        expect(regex.test("1e10")).to.equal(true);
        expect(regex.test("2E-3")).to.equal(true);
        expect(regex.test("4.2e+8")).to.equal(true);
        expect(regex.test("10\n")).to.equal(true);
        expect(regex.test("1010")).to.equal(true);
        expect(regex.test("1011111000111111111111111"));
    });

    it("does not match invalid numbers", () => {
        expect(regex.test("")).to.equal(false);
        expect(regex.test("a")).to.equal(false);
        expect(regex.test(".4")).to.equal(false);
    });

    it("does match bits", () => {});
});

describe("Keyword regex test", () => {
    const regex = new RegExp(OBJECT_REGEX);
    it("matches valid keywords", () => {
        expect(regex.test("System:  Test")).to.equal(true);
        expect(regex.test("System: Test")).to.equal(true);
        expect(regex.test("Test:  A1")).to.equal(true);
    });

    it("does not match invalid keywords", () => {
        expect(regex.test("System::  Test")).to.equal(false);
        expect(regex.test("System:Test")).to.equal(false);
    });
});

describe("Attribute Regex Tests", () => {
    const regex = ATTRIBUTE_REGEX;
    it("Does not match variables assignment without spaces", () => {
        const input = "var1=value1";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });

    it("Matches attribute assignment with spaces", () => {
        const input = "var1= value1";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(2);
        expect(matches?.[0]).to.equal("var1= ");
        expect(matches?.[1]).to.equal("var1");
    });

    it("Does not match tagmap with space in declaration", () => {
        const input = "var var1=";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });

    it("Does not match invalid input", () => {
        const input = "var1== 'value1';";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
});

describe("Block comment Regex Tests", () => {
    const regex = BLOCK_COMMENT_REGEX;
    it("Matches block comment with text", () => {
        const input = "/* This is a block comment */";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(1);
    });

    it("Matches empty block comment", () => {
        const input = "/* */";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(1);
        expect(matches?.[0]).to.equal("/* */");
    });

    it("Does not match inline comment", () => {
        const input = "var a = 10; // This is an inline comment";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });

    it("Does not match invalid input", () => {
        const input = "This is not a comment";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
});

describe("Jinja Comment Regex Tests", () => {
    const regex = JINJA_COMMENT_REGEX;
    it("Matches jinja comment with text", () => {
        const input = "{# This is a jinja comment #}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Matches jinja comment without text", () => {
        const input = "{##}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Matches jinja comment with jinja", () => {
        const input = "{# {{ Test }} #}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Does not match invalid jinja comment", () => {
        const input = "{# Test }";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
    it("Does not match invalid jinja comment", () => {
        const input = "# Test #";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
});

describe("Jinja Expression Regex Tests", () => {
    const regex = JINJA_EXPRESSION_REGEX;
    it("Matches jinja expression", () => {
        const input = "{%- if final|default(false) %}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Matches jinja expression", () => {
        const input = "{% {# #} %}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Matches jinja expression", () => {
        const input = "{%%}";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
    });
    it("Does not match invalid jinja expression", () => {
        const input = "{% Test }";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
    it("Does not match invalid jinja expression", () => {
        const input = "% Test %";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
});

describe("Line Comment Regex Tests", () => {
    const regex = LINE_COMMENT_REGEX;
    it("Matches line comment with text", () => {
        const input = "// This is a line comment";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(3);
        expect(matches?.[0]).to.equal("// This is a line comment");
        expect(matches?.[1]).to.equal("//");
        expect(matches?.[2]).to.equal(" This is a line comment");
    });

    it("Matches empty line comment", () => {
        const input = "//";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(3);
        expect(matches?.[0]).to.equal("//");
        expect(matches?.[1]).to.equal("//");
        expect(matches?.[2]).to.equal("");
    });

    it("Does not match block comment", () => {
        const input = "/* This is a block comment */";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });

    it("Does not match invalid input", () => {
        const input = "This is not a comment";
        const matches = input.match(regex);
        expect(matches).to.equal(null);
    });
});

describe("String Regex Tests", () => {
    const regex = STRING_REGEX;
    it("Matches a string with no whitespace", () => {
        const input = '"hello"';
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(2);
        expect(matches?.[0]).to.equal('"hello"');
        expect(matches?.[1]).to.equal("hello");
    });

    it("Matches a string with whitespace", () => {
        const input = '"hello world"';
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(2);
        expect(matches?.[0]).to.equal('"hello world"');
        expect(matches?.[1]).to.equal("hello world");
    });

    it("Matches a string with whitespace", () => {
        const input = `"Dummy applikasjon"
         Text2=  "1: Test �, 2: Test �, 3: Test �"
         Nsecs=  10
       PlotMax=  10
         Nhist=  8640
         Npred=  360
         Nmodl=  360`;
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(2);
        expect(matches?.[0]).to.equal('"Dummy applikasjon"');
        expect(matches?.[1]).to.equal("Dummy applikasjon");
    });

    it("Matches an empty string", () => {
        const input = '""';
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.length).to.equal(2);
        expect(matches?.[0]).to.equal('""');
        expect(matches?.[1]).to.equal("");
    });

    it("Does not match a number", () => {
        const input = "123";
        const matches = String(input).match(regex);
        expect(matches).to.equal(null);
    });

    it("Does not match a boolean", () => {
        const input = "true";
        const matches = String(input).match(regex);
        expect(matches).to.equal(null);
    });
});

describe("Variable regex test", () => {
    const regex = IDENTIFIER_REGEX;
    it("matches valid strings", () => {
        expect(regex.test("abc123 ")).to.equal(true);
        expect(regex.test("some-tag ")).to.equal(true);
        expect(regex.test("some_tag ")).to.equal(true);
        expect(regex.test("some-other-tag ")).to.equal(true);
    });

    it("does not match invalid strings", () => {
        expect(regex.test("")).to.equal(false);
        expect(regex.test(" ")).to.equal(false);
        expect(regex.test(".test ")).to.equal(false);
    });

    it("does not match entire string with whitespace", () => {
        const input = "Hello world!";
        const matches = input.match(regex);
        expect(matches).not.to.equal(null);
        expect(matches?.[1]).to.equal("Hello");
    });

    it("matches valid jinja", () => {
        expect(regex.test("{{SomeText}} ")).to.equal(true);
        expect(regex.test("{{ SomeText }} ")).to.equal(true);
        expect(regex.test("{{SomeText123}} ")).to.equal(true);
        expect(regex.test("{{Some_Text}} ")).to.equal(true);
        expect(regex.test("{{Some-Text}} ")).to.equal(true);
    });

    it("does not match invalid jinja", () => {
        expect(regex.test("")).to.equal(false);
        expect(regex.test("{{}} ")).to.equal(false);
        expect(regex.test("{{  }} ")).to.equal(false);
        expect(regex.test("{{Some Text}} ")).to.equal(false);
    });

    it("does match valid variables", () => {
        expect(regex.test("{{ Test }}Something ")).to.equal(true);
        expect(regex.test("Something{{ Test }}Something ")).to.equal(true);
        expect(regex.test("Something{{ Test }} ")).to.equal(true);
        expect(regex.test("Some{{ Test }}Some{{Test}}")).to.equal(true);
    });
});
