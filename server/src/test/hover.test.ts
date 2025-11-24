/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { describe, it } from "mocha";
import { compareRange, loadFile, parseSepticForTest } from "./util";
import { TextDocument } from "vscode-languageserver-textdocument";
import { MarkupContent, Position } from "vscode-languageserver";
import {
    getCalcHover,
    getHover,
    getObjectHover,
    getReferenceHover,
} from "../language-service/hoverProvider";
import { expect } from "chai";

describe("Test reference hover", () => {
    it("Expect to get mvr text when hovering on SopcMvr with same name", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(0, 21);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        if (!hover?.range) {
            return;
        }
        compareRange(
            {
                start: Position.create(0, 17),
                end: Position.create(0, 24),
            },
            hover.range
        );
        const hoverMarkdown = hover.contents as MarkupContent;
        expect(/\bMvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get mvr text when hovering on mvr", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(49, 21);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        if (hover?.range) {
            compareRange(
                {
                    start: Position.create(49, 17),
                    end: Position.create(49, 24),
                },
                hover.range
            );
        }
        const hoverMarkdown = hover!.contents as MarkupContent;
        expect(/\bMvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get SopcCvr text when hovering on SopcCvr without Cvr", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(31, 21);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(31, 17),
                end: Position.create(31, 24),
            },
            hover?.range!
        );
        const hoverMarkdown = hover!.contents as MarkupContent;
        expect(/\SopcCvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get Evr text when hovering on Evr ref in CalcPvr identifier", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(125, 21);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(125, 17),
                end: Position.create(125, 24),
            },
            hover?.range!
        );
        const hoverMarkdown = hover!.contents as MarkupContent;
        expect(/\bEvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get Tvr text when hovering on Tvr ref in CalcPvr Alg", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 29);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        const hoverMarkdown = hover!.contents as MarkupContent;
        expect(/\bTvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get Mvr text when hovering on Mvr ref in CalcPvr Alg", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 45);
        const hover = getReferenceHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        const hoverMarkdown = hover!.contents as MarkupContent;
        expect(/\bMvr\b/.test(hoverMarkdown.value.split("\n")[0])).to.equal(
            true
        );
    });
    it("Expect to get undefined when not hovering on ref", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(121, 21);
        const hover = getReferenceHover(cnfg, position, cnfg);

        expect(hover).to.equal(undefined);
    });
});

describe("Test object hovering", () => {
    it("Expect object hover when hovering on documented type", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(49, 4);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(49, 2),
                end: Position.create(49, 5),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/\bMvr\b/.test(docMarkdown.value)).to.equal(true);
    });
    it("Expect undefined hover when hovering on undocumented type", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(130, 5);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });

    it("Expect undefined hover when hovering outside of definition type", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(49, 7);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });
    it("Expect attribute hover when hovering on attribute key", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(52, 12);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(52, 10),
                end: Position.create(52, 14),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/\bMode\b/.test(docMarkdown.value)).to.equal(true);
    });
    it("Expect undefined hover when hovering on undocumented attribute key", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(73, 12);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });
    it("Expect undefined hover when hovering on outside of attribute key", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(52, 20);
        const hover = getObjectHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });
});

describe("Test calc hovering", () => {
    it("Expect calc documentation when hovering on name of calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 22);
        const hover = getCalcHover(cnfg, position);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(128, 18),
                end: Position.create(128, 38),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/labupdt/.test(docMarkdown.value.split("\n")[1])).to.equal(true);
    });
    it("Expect calc documentation when hovering on parameters of calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 34);
        const hover = getCalcHover(cnfg, position);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(128, 18),
                end: Position.create(128, 38),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/labupdt/.test(docMarkdown.value.split("\n")[1])).to.equal(true);
    });
    it("Expect innermost calc documentation when hovering inside multiple calcs", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(136, 26);
        const hover = getCalcHover(cnfg, position);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(136, 21),
                end: Position.create(136, 38),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/and/.test(docMarkdown.value.split("\n")[1])).to.equal(true);
    });
    it("Expect undefined when hovering outside of calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 39);
        const hover = getCalcHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });
    it("Expect undefined when hovering on undocumented calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(141, 21);
        const hover = getCalcHover(cnfg, position);
        expect(hover).to.equal(undefined);
    });
});

describe("Test get hover logic", () => {
    it("Expect to return object hover when hovering on object", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(49, 4);
        const hover = getHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(49, 2),
                end: Position.create(49, 5),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/\bMvr\b/.test(docMarkdown.value)).to.equal(true);
    });
    it("Expect to get reference hover when hovering on reference inside calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(128, 30);
        const hover = getHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(128, 26),
                end: Position.create(128, 33),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/\bTvr\b/.test(docMarkdown.value)).to.equal(true);
    });
    it("Expect to get calc hover when hovering on calc", () => {
        const content = loadFile("hover.cnfg");
        const cnfg = parseSepticForTest(content);
        const position = Position.create(136, 19);
        const hover = getHover(cnfg, position, cnfg);
        expect(hover).to.not.equal(undefined);
        compareRange(
            {
                start: Position.create(136, 18),
                end: Position.create(136, 42),
            },
            hover?.range!
        );
        const docMarkdown = hover?.contents as MarkupContent;
        expect(/if/.test(docMarkdown.value.split("\n")[1])).to.equal(true);
    });
});
