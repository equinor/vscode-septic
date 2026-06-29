import { describe, it } from "mocha";
import { expect } from "chai";
import { findCaseDiscrepancies, findLayoutNameOffset } from "../util/caseCheck";

describe("Test findLayoutNameOffset", () => {
    it("Finds offset for simple layout name", () => {
        const yaml = "layout:\n  - name: template.cnfg\n    source: wells";
        const offset = findLayoutNameOffset(yaml, "template.cnfg");
        expect(offset).to.equal(yaml.indexOf("template.cnfg"));
    });

    it("Finds offset without leading dash", () => {
        const yaml = "layout:\n  name: myfile.cnfg\n";
        const offset = findLayoutNameOffset(yaml, "myfile.cnfg");
        expect(offset).to.equal(yaml.indexOf("myfile.cnfg"));
    });

    it("Returns -1 when name is not found", () => {
        const yaml = "layout:\n  - name: other.cnfg\n";
        const offset = findLayoutNameOffset(yaml, "missing.cnfg");
        expect(offset).to.equal(-1);
    });

    it("Handles special regex characters in filename", () => {
        const yaml = "layout:\n  - name: file(1).cnfg\n";
        const offset = findLayoutNameOffset(yaml, "file(1).cnfg");
        expect(offset).to.equal(yaml.indexOf("file(1).cnfg"));
    });

    it("Finds correct offset with multiple layout entries", () => {
        const yaml = "layout:\n  - name: first.cnfg\n  - name: second.cnfg\n";
        const offset = findLayoutNameOffset(yaml, "second.cnfg");
        expect(offset).to.equal(yaml.indexOf("second.cnfg"));
    });
});

describe("Test findCaseDiscrepancies", () => {
    const yamlText =
        "layout:\n  - name: Template.cnfg\n  - name: correct.cnfg\n  - name: Other.cnfg\n";

    it("Detects case mismatch between layout name and directory entry", () => {
        const layoutNames = ["Template.cnfg"];
        const dirEntries = ["template.cnfg"];
        const result = findCaseDiscrepancies(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(1);
        expect(result[0].fileName).to.equal("Template.cnfg");
        expect(result[0].actualName).to.equal("template.cnfg");
        expect(result[0].offset).to.equal(yamlText.indexOf("Template.cnfg"));
    });

    it("Returns empty when casing matches exactly", () => {
        const layoutNames = ["correct.cnfg"];
        const dirEntries = ["correct.cnfg"];
        const result = findCaseDiscrepancies(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(0);
    });

    it("Returns empty when file does not exist in directory", () => {
        const layoutNames = ["nonexistent.cnfg"];
        const dirEntries = ["template.cnfg", "correct.cnfg"];
        const result = findCaseDiscrepancies(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(0);
    });

    it("Detects multiple case mismatches", () => {
        const layoutNames = ["Template.cnfg", "correct.cnfg", "Other.cnfg"];
        const dirEntries = ["template.cnfg", "correct.cnfg", "other.cnfg"];
        const result = findCaseDiscrepancies(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(2);
        expect(result[0].fileName).to.equal("Template.cnfg");
        expect(result[0].actualName).to.equal("template.cnfg");
        expect(result[1].fileName).to.equal("Other.cnfg");
        expect(result[1].actualName).to.equal("other.cnfg");
    });

    it("Returns empty for empty layout names", () => {
        const result = findCaseDiscrepancies([], ["file.cnfg"], yamlText);
        expect(result).to.have.lengthOf(0);
    });

    it("Returns empty for empty directory entries", () => {
        const result = findCaseDiscrepancies(["Template.cnfg"], [], yamlText);
        expect(result).to.have.lengthOf(0);
    });
});
