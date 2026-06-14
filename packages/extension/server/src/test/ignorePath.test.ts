import { expect } from "chai";
import {
    IgnoredPaths,
    getIgnoredCodes,
    pathToRegex,
} from "../ignorePath";

const workspace = "file:///workspace";

function makePatterns(
    entries: { [path: string]: string[] },
): IgnoredPaths[] {
    return Object.keys(entries).map((path) => ({
        regex: pathToRegex(workspace, path),
        codes: entries[path],
    }));
}

describe("Test ignorePath pathToRegex", () => {
    it("Matches a single specific file", () => {
        const regex = pathToRegex(workspace, "external/test.cnfg");
        expect(regex.test(`${workspace}/external/test.cnfg`)).to.equal(true);
        expect(regex.test(`${workspace}/external/other.cnfg`)).to.equal(false);
    });

    it("Wildcard matches files and nested subfolders", () => {
        const regex = pathToRegex(workspace, "external/*");
        expect(regex.test(`${workspace}/external/test.cnfg`)).to.equal(true);
        expect(regex.test(`${workspace}/external/sub/deep/test.cnfg`)).to.equal(
            true,
        );
        expect(regex.test(`${workspace}/other/test.cnfg`)).to.equal(false);
    });

    it("Single '*' matches every file", () => {
        const regex = pathToRegex(workspace, "*");
        expect(regex.test(`${workspace}/anything.cnfg`)).to.equal(true);
        expect(regex.test(`${workspace}/deep/nested/file.cnfg`)).to.equal(true);
    });

    it("Strips leading ./ and /", () => {
        const regexDot = pathToRegex(workspace, "./external/*");
        const regexSlash = pathToRegex(workspace, "/external/*");
        expect(regexDot.test(`${workspace}/external/test.cnfg`)).to.equal(true);
        expect(regexSlash.test(`${workspace}/external/test.cnfg`)).to.equal(
            true,
        );
    });

    it("'?' matches a single character", () => {
        const regex = pathToRegex(workspace, "external/test?.cnfg");
        expect(regex.test(`${workspace}/external/test1.cnfg`)).to.equal(true);
        expect(regex.test(`${workspace}/external/test12.cnfg`)).to.equal(false);
    });
});

describe("Test ignorePath getIgnoredCodes", () => {
    it("Returns undefined when no pattern matches", () => {
        const patterns = makePatterns({ "external/*": [] });
        const codes = getIgnoredCodes(`${workspace}/src/test.cnfg`, patterns);
        expect(codes).to.equal(undefined);
    });

    it("Returns empty array (ignore all) for empty codes", () => {
        const patterns = makePatterns({ "external/*": [] });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.deep.equal([]);
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
            "*": ["W101", "W502", "E206"],
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
            "*": ["W101", "W502"],
            "external/*": ["W101", "E301"],
        });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.have.members(["W101", "W502", "E301"]);
        expect(codes).to.have.lengthOf(3);
    });

    it("Global '*' does not shadow a more specific ignore-all pattern", () => {
        const patterns = makePatterns({
            "*": ["W101", "W502", "E206"],
            "external/*": [],
        });
        const codes = getIgnoredCodes(
            `${workspace}/external/test.cnfg`,
            patterns,
        );
        expect(codes).to.deep.equal([]);
    });

    it("Applies only global codes to files outside specific folders", () => {
        const patterns = makePatterns({
            "*": ["W101", "W502", "E206"],
            "external/*": [],
        });
        const codes = getIgnoredCodes(`${workspace}/src/test.cnfg`, patterns);
        expect(codes).to.deep.equal(["W101", "W502", "E206"]);
    });
});
