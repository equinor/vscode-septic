import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticMetaInfoProvider, parseSeptic } from "../septic";
import { loadFile } from "./util";
import { Position, CodeActionParams, Diagnostic } from "vscode-languageserver";
import { getCodeActionInsertEvr } from "../language-service/codeActionProvider";
import { DiagnosticCode } from "../language-service/diagnosticsProvider";
import { expect } from "chai";

describe("Test codeaction for inserting evr", () => {
    it("Expect to insert evr for missing reference in calcpvr identifier at bottom", async () => {
        const range = {
            start: Position.create(31, 17),
            end: Position.create(31, 24),
        };
        const params: CodeActionParams = {
            textDocument: { uri: "" },
            range: range,
            context: {
                diagnostics: [
                    Diagnostic.create(
                        range,
                        "Test",
                        undefined,
                        DiagnosticCode.missingReference
                    ),
                ],
            },
        };
        const content = loadFile("codeAction.cnfg");
        const cnfg = parseSeptic(content);
        await cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionInsertEvr(params, cnfg, doc, "bottom");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(doc.positionAt(action.offsetEdit).line).to.greaterThan(24);
        expect(action.name === "NewTest");
    });
    it("Expect to insert evr for missing reference in calcpvr identifier at top", () => {
        const range = {
            start: Position.create(31, 17),
            end: Position.create(31, 24),
        };
        const params: CodeActionParams = {
            textDocument: { uri: "" },
            range: range,
            context: {
                diagnostics: [
                    Diagnostic.create(
                        range,
                        "Test",
                        undefined,
                        DiagnosticCode.missingReference
                    ),
                ],
            },
        };
        const content = loadFile("codeAction.cnfg");
        const cnfg = parseSeptic(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionInsertEvr(params, cnfg, doc, "top");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(doc.positionAt(action.offsetEdit).line).to.lessThan(9);
        expect(action.name === "NewTest");
    });
    it("Expect to insert evr for missing reference in alg", () => {
        const range = {
            start: Position.create(34, 18),
            end: Position.create(34, 31),
        };
        const params: CodeActionParams = {
            textDocument: { uri: "" },
            range: range,
            context: {
                diagnostics: [
                    Diagnostic.create(
                        range,
                        "Test",
                        undefined,
                        DiagnosticCode.missingReference
                    ),
                ],
            },
        };
        const content = loadFile("codeAction.cnfg");
        const cnfg = parseSeptic(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionInsertEvr(params, cnfg, doc, "bottom");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(doc.positionAt(action.offsetEdit).line).to.greaterThan(24);
        expect(action.name === "SomethingTest");
    });
    it("Expect no insert evr existing reference", () => {
        const range = {
            start: Position.create(34, 32),
            end: Position.create(34, 36),
        };
        const params: CodeActionParams = {
            textDocument: { uri: "" },
            range: range,
            context: {
                diagnostics: [],
            },
        };
        const content = loadFile("codeAction.cnfg");
        const cnfg = parseSeptic(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionInsertEvr(params, cnfg, doc, "bottom");
        expect(codeActions.length).to.equal(0);
    });
});
