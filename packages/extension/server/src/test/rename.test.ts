import { TextDocument } from "vscode-languageserver-textdocument";
import { compareRange, loadFile, parseSepticForTest } from "./util";
import { Position, Range, TextDocumentEdit } from "vscode-languageserver";
import { expect } from "chai";
import {
    GetDocument,
    getRenameEdits,
} from "../language-service/renameProvider";

const getDocumentFunction = (doc: TextDocument): GetDocument => {
    return (): Promise<TextDocument | undefined> => {
        return Promise.resolve(doc);
    };
};

describe("Test renaming", () => {
    it("Expect to rename 5 refs when renaming Test1", async () => {
        const content = loadFile("rename.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("test.cnfg", "", 0, content);
        const getDocument: GetDocument = getDocumentFunction(doc);
        const position = Position.create(0, 21);
        const renameEdits = await getRenameEdits(
            cnfg,
            position,
            "New",
            cnfg,
            getDocument,
        );
        const edits = renameEdits!.documentChanges![0] as TextDocumentEdit;
        const expectedRanges: Range[] = [
            { start: Position.create(0, 17), end: Position.create(0, 22) },
            { start: Position.create(3, 17), end: Position.create(3, 22) },
            { start: Position.create(12, 18), end: Position.create(12, 23) },
            { start: Position.create(17, 18), end: Position.create(17, 23) },
            { start: Position.create(23, 27), end: Position.create(23, 32) },
        ];
        const actualRanges = edits.edits.map((edit) => edit.range);
        sortRange(actualRanges);
        compareRanges(expectedRanges, actualRanges);
    });
    it("Expect to rename 5 refs when renaming Test1 from inside alg", async () => {
        const content = loadFile("rename.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("test.cnfg", "", 0, content);
        const getDocument: GetDocument = getDocumentFunction(doc);
        const position = Position.create(12, 21);
        const renameEdits = await getRenameEdits(
            cnfg,
            position,
            "New",
            cnfg,
            getDocument,
        );
        const edits = renameEdits!.documentChanges![0] as TextDocumentEdit;
        const expectedRanges: Range[] = [
            { start: Position.create(0, 17), end: Position.create(0, 22) },
            { start: Position.create(3, 17), end: Position.create(3, 22) },
            { start: Position.create(12, 18), end: Position.create(12, 23) },
            { start: Position.create(17, 18), end: Position.create(17, 23) },
            { start: Position.create(23, 27), end: Position.create(23, 32) },
        ];
        const actualRanges = edits.edits.map((edit) => edit.range);
        sortRange(actualRanges);
        compareRanges(expectedRanges, actualRanges);
    });
    it("Expect to rename 4 refs when renaming Test2", async () => {
        const content = loadFile("rename.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("test.cnfg", "", 0, content);
        const getDocument: GetDocument = getDocumentFunction(doc);
        const position = Position.create(6, 21);
        const renameEdits = await getRenameEdits(
            cnfg,
            position,
            "New",
            cnfg,
            getDocument,
        );
        const edits = renameEdits!.documentChanges![0] as TextDocumentEdit;
        const expectedRanges: Range[] = [
            { start: Position.create(6, 17), end: Position.create(6, 22) },
            { start: Position.create(9, 17), end: Position.create(9, 22) },
            { start: Position.create(23, 18), end: Position.create(23, 23) },
            { start: Position.create(25, 17), end: Position.create(25, 22) },
        ];
        const actualRanges = edits.edits.map((edit) => edit.range);
        sortRange(actualRanges);
        compareRanges(expectedRanges, actualRanges);
    });
    it("Expect to rename 4 refs when renaming Test2 inside Xvr list", async () => {
        const content = loadFile("rename.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("test.cnfg", "", 0, content);
        const getDocument: GetDocument = getDocumentFunction(doc);
        const position = Position.create(23, 21);
        const renameEdits = await getRenameEdits(
            cnfg,
            position,
            "New",
            cnfg,
            getDocument,
        );
        const edits = renameEdits!.documentChanges![0] as TextDocumentEdit;
        const expectedRanges: Range[] = [
            { start: Position.create(6, 17), end: Position.create(6, 22) },
            { start: Position.create(9, 17), end: Position.create(9, 22) },
            { start: Position.create(23, 18), end: Position.create(23, 23) },
            { start: Position.create(25, 17), end: Position.create(25, 22) },
        ];
        const actualRanges = edits.edits.map((edit) => edit.range);
        sortRange(actualRanges);
        compareRanges(expectedRanges, actualRanges);
    });
    it("Expect to no renames when trying to rename outside of ref", async () => {
        const content = loadFile("rename.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("test.cnfg", "", 0, content);
        const getDocument: GetDocument = getDocumentFunction(doc);
        const position = Position.create(7, 21);
        const renameEdits = await getRenameEdits(
            cnfg,
            position,
            "New",
            cnfg,
            getDocument,
        );
        expect(renameEdits?.documentChanges).to.equal(undefined);
    });
});

function compareRanges(expectedRanges: Range[], actualRanges: Range[]) {
    expect(actualRanges.length).to.equal(expectedRanges.length);
    for (let i = 0; i < expectedRanges.length; i++) {
        const e = expectedRanges[i];
        const a = actualRanges[i];
        compareRange(e, a);
    }
}

function sortRange(ranges: Range[]) {
    return ranges.sort((a, b) => {
        if (a.start.line === b.start.line) {
            return a.start.character - b.start.character;
        } else {
            return a.start.line - b.start.line;
        }
    });
}
