import { describe, it } from "mocha";
import { expect } from "chai";
import {
    findLayoutFileIssues,
    findLayoutNameOffset,
    findSourceFileIssues,
    findSourceFilenameOffset,
} from "../util/caseCheck";

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

describe("Test findLayoutFileIssues", () => {
    const yamlText =
        "layout:\n  - name: Template.cnfg\n  - name: correct.cnfg\n  - name: Other.cnfg\n";

    it("Detects case mismatch between layout name and directory entry", () => {
        const layoutNames = ["Template.cnfg"];
        const dirEntries = ["template.cnfg"];
        const result = findLayoutFileIssues(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.deep.equal({
            kind: "case",
            fileName: "Template.cnfg",
            actualName: "template.cnfg",
            offset: yamlText.indexOf("Template.cnfg"),
        });
    });

    it("Returns empty when casing matches exactly", () => {
        const layoutNames = ["correct.cnfg"];
        const dirEntries = ["correct.cnfg"];
        const result = findLayoutFileIssues(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(0);
    });

    it("Reports an error when the file does not exist in the directory", () => {
        const layoutNames = ["nonexistent.cnfg"];
        const dirEntries = ["template.cnfg", "correct.cnfg"];
        const missingYaml = yamlText.replace("Other.cnfg", "nonexistent.cnfg");
        const result = findLayoutFileIssues(layoutNames, dirEntries, missingYaml);
        expect(result).to.deep.equal([
            {
                kind: "missing",
                fileName: "nonexistent.cnfg",
                offset: missingYaml.indexOf("nonexistent.cnfg"),
            },
        ]);
    });

    it("Detects multiple case mismatches", () => {
        const layoutNames = ["Template.cnfg", "correct.cnfg", "Other.cnfg"];
        const dirEntries = ["template.cnfg", "correct.cnfg", "other.cnfg"];
        const result = findLayoutFileIssues(layoutNames, dirEntries, yamlText);
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.include({
            kind: "case",
            fileName: "Template.cnfg",
            actualName: "template.cnfg",
        });
        expect(result[1]).to.include({
            kind: "case",
            fileName: "Other.cnfg",
            actualName: "other.cnfg",
        });
    });

    it("Returns empty for empty layout names", () => {
        const result = findLayoutFileIssues([], ["file.cnfg"], yamlText);
        expect(result).to.have.lengthOf(0);
    });

    it("Reports missing files for empty directory entries", () => {
        const result = findLayoutFileIssues(["Template.cnfg"], [], yamlText);
        expect(result).to.deep.equal([
            {
                kind: "missing",
                fileName: "Template.cnfg",
                offset: yamlText.indexOf("Template.cnfg"),
            },
        ]);
    });
});

describe("Test source filename case discrepancies", () => {
    const yamlText =
        "sources:\n  - filename: sources/One.csv\n    id: one\n" +
        "  - filename:\n      - sources/Two.csv\n      - sources/Three.csv\n    id: many\n" +
        "layout:\n  - name: template.cnfg\n";

    it("Detects a case mismatch for a scalar source filename", () => {
        const mismatchedYaml = yamlText.replace(
            "sources/One.csv",
            "sources/ONE.csv",
        );
        const dirEntriesBySource = new Map([[
            "sources/ONE.csv",
            ["One.csv"],
        ]]);
        const result = findSourceFileIssues(
            ["sources/ONE.csv"],
            dirEntriesBySource,
            mismatchedYaml,
        );
        expect(result).to.deep.equal([
            {
            kind: "case",
                fileName: "sources/ONE.csv",
                actualName: "One.csv",
                offset: mismatchedYaml.indexOf("sources/ONE.csv"),
            },
        ]);
    });

    it("Detects a case mismatch for a filename in a source list", () => {
        const mismatchedYaml = yamlText.replace(
            "sources/Three.csv",
            "sources/THREE.csv",
        );
        const dirEntriesBySource = new Map([[
            "sources/THREE.csv",
            ["Two.csv", "Three.csv"],
        ]]);
        const result = findSourceFileIssues(
            ["sources/THREE.csv"],
            dirEntriesBySource,
            mismatchedYaml,
        );
        expect(result).to.deep.equal([
            {
            kind: "case",
                fileName: "sources/THREE.csv",
                actualName: "Three.csv",
                offset: mismatchedYaml.indexOf("sources/THREE.csv"),
            },
        ]);
    });

    it("Finds a source filename offset in a scalar or list", () => {
        expect(findSourceFilenameOffset(yamlText, "sources/One.csv")).to.equal(
            yamlText.indexOf("sources/One.csv"),
        );
        expect(
            findSourceFilenameOffset(yamlText, "sources/Three.csv"),
        ).to.equal(yamlText.indexOf("sources/Three.csv"));
    });

    it("Reports a missing source filename", () => {
        const missingPath = "sources/missing.csv";
        const missingYaml = yamlText.replace("sources/One.csv", missingPath);
        const result = findSourceFileIssues(
            [missingPath],
            new Map([[missingPath, ["One.csv"]]]),
            missingYaml,
        );
        expect(result).to.deep.equal([
            {
                kind: "missing",
                fileName: missingPath,
                offset: missingYaml.indexOf(missingPath),
            },
        ]);
    });
});
