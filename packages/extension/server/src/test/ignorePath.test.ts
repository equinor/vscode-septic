import { expect } from "chai";
import { describe, it } from "mocha";
import {
    IgnoredPaths,
    getIgnoredCodes,
    toAbsoluteGlob,
} from "../ignorePath";

const workspace = "file:///workspace";

function makePatterns(
    entries: { [path: string]: string[] },
): IgnoredPaths[] {
    return Object.keys(entries).map((path) => ({
        pattern: toAbsoluteGlob(workspace, path),
        codes: entries[path],
    }));
}

describe("Test ignorePath toAbsoluteGlob", () => {
    it("Builds absolute glob for a specific file", () => {
        const pattern = toAbsoluteGlob(workspace, "external/test.cnfg");
        expect(pattern).to.equal(`${workspace}/external/test.cnfg`);
    });

    it("Strips leading ./ and /", () => {
        const patternDot = toAbsoluteGlob(workspace, "./external/*");
        const patternSlash = toAbsoluteGlob(workspace, "/external/*");
        expect(patternDot).to.equal(`${workspace}/external/*`);
        expect(patternSlash).to.equal(`${workspace}/external/*`);
    });
});

describe("Test ignorePath getIgnoredCodes", () => {
    it("Returns undefined when no pattern matches", () => {
        const patterns = makePatterns({ "external/*": ["W101"] });
        const codes = getIgnoredCodes(`${workspace}/src/test.cnfg`, patterns);
        expect(codes).to.equal(undefined);
    });

    it("Returns ['*'] (ignore all) for ['*'] codes", () => {
        const patterns = makePatterns({ "external/*": ["*"] });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.deep.equal(["*"]);
    });

    it("Empty codes array is a no-op", () => {
        const patterns = makePatterns({ "external/*": [] });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.equal(undefined);
    });

    it("Returns the specific codes for a matching path", () => {
        const patterns = makePatterns({ "external/*": ["W101", "W502"] });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.deep.equal(["W101", "W502"]);
    });

    it("Aggregates codes from all matching patterns", () => {
        const patterns = makePatterns({
            "**": ["W101", "W502", "E206"],
            "external/*": ["E301"],
        });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.have.members(["W101", "W502", "E206", "E301"]);
        expect(codes).to.have.lengthOf(4);
    });

    it("Deduplicates codes shared across matching patterns", () => {
        const patterns = makePatterns({
            "**": ["W101", "W502"],
            "external/*": ["W101", "E301"],
        });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.have.members(["W101", "W502", "E301"]);
        expect(codes).to.have.lengthOf(3);
    });

    it("Ignore-all ['*'] wins over specific codes from other patterns", () => {
        const patterns = makePatterns({
            "**": ["W101", "W502", "E206"],
            "external/*": ["*"],
        });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.deep.equal(["*"]);
    });

    it("Applies only global codes to files outside specific folders", () => {
        const patterns = makePatterns({
            "**": ["W101", "W502", "E206"],
            "external/*": ["*"],
        });
        const codes = getIgnoredCodes(`${workspace}/src/test.cnfg`, patterns);
        expect(codes).to.have.members(["W101", "W502", "E206"]);
        expect(codes).to.have.lengthOf(3);
    });

    it("Wildcard '*' matches files in a single directory level", () => {
        const patterns = makePatterns({ "external/*": ["W101"] });
        expect(getIgnoredCodes(`${workspace}/external/test.cnfg`, patterns)).to.deep.equal(["W101"]);
        expect(getIgnoredCodes(`${workspace}/external/sub/test.cnfg`, patterns)).to.equal(undefined);
    });

    it("Globstar '**' matches files across directory levels", () => {
        const patterns = makePatterns({ "external/**": ["W101"] });
        expect(getIgnoredCodes(`${workspace}/external/test.cnfg`, patterns)).to.deep.equal(["W101"]);
        expect(getIgnoredCodes(`${workspace}/external/sub/deep/test.cnfg`, patterns)).to.deep.equal(["W101"]);
    });
});
