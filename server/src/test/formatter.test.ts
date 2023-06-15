import {
    jinjaForRegex,
    jinjaForEndRegex,
    jinjaIfRegex,
    jinjaIfEndRegex,
    startFormattingRegex,
    stopFormattingRegex,
    lineCommentRegex,
} from "../language-service/formatProvider";
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
    });

    it("does not match invalid", () => {
        expect(regex.test("//Test")).to.equal(false);
        expect(regex.test("/* Test */bs")).to.equal(false);
    });
});
