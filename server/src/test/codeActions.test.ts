import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticMetaInfoProvider } from "../septic";
import { loadFile, parseSepticForTest } from "./util";
import {
    Position,
    CodeActionParams,
    Diagnostic,
    TextDocumentEdit,
} from "vscode-languageserver";
import {
    getCodeActionInsertEvr,
    getCodeActionIgnoreDiagnostics,
} from "../language-service/codeActionProvider";
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
        const cnfg = parseSepticForTest(content);
        await cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const codeActions = getCodeActionInsertEvr(params, cnfg, "bottom");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(cnfg.positionAt(action.offset).line).to.greaterThan(24);
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
        const cnfg = parseSepticForTest(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const codeActions = getCodeActionInsertEvr(params, cnfg, "top");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(cnfg.positionAt(action.offset).line).to.lessThan(9);
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
        const cnfg = parseSepticForTest(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const codeActions = getCodeActionInsertEvr(params, cnfg, "bottom");
        expect(codeActions.length).to.equal(1);
        const action = codeActions[0];
        expect(cnfg.positionAt(action.offset).line).to.greaterThan(24);
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
        const cnfg = parseSepticForTest(content);
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionInsertEvr(params, cnfg, "bottom");
        expect(codeActions.length).to.equal(0);
    });
});

describe("Test codeaction for ignoring warning", () => {
    it("Expect code actions to ignore warning", async () => {
        const range = {
            start: Position.create(3, 17),
            end: Position.create(3, 31),
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
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(2);
        expect(codeActions[0].title === `W501: Disable with {# noqa: .... #}`);
        expect(codeActions[1].title === `W501: Disable with // noqa: ....`);
    });
    it("Expect code actions to suggest updating ignore comment jinja", async () => {
        const range = {
            start: Position.create(8, 34),
            end: Position.create(8, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(1);
        expect(codeActions[0].title === `E202: Update disable diagnostics`);
        const textEdits = codeActions[0].edit?.documentChanges?.at(
            0
        ) as TextDocumentEdit;
        const updatedeContent = TextDocument.applyEdits(doc, textEdits.edits);
        const updatedCnfg = parseSepticForTest(updatedeContent);
        expect(updatedCnfg.comments[0].content).to.equal(
            "{# noqa: W501, E202 #}"
        );
    });
    it("Expect code actions to suggest updating ignore comment", async () => {
        const range = {
            start: Position.create(13, 34),
            end: Position.create(13, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(1);
        expect(codeActions[0].title === `E202: Update disable diagnostics`);
        const textEdits = codeActions[0].edit?.documentChanges?.at(
            0
        ) as TextDocumentEdit;
        const updatedeContent = TextDocument.applyEdits(doc, textEdits.edits);
        const updatedCnfg = parseSepticForTest(updatedeContent);
        expect(updatedCnfg.comments[1].content).to.equal("// noqa: W501, E202");
    });
    it("Expect code actions to suggest updating ignore comments for all codes", async () => {
        const range = {
            start: Position.create(8, 34),
            end: Position.create(8, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                    Diagnostic.create(
                        range,
                        "Test",
                        undefined,
                        DiagnosticCode.missingReference
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(2);
        expect(codeActions[0].title === `E202: Update disable diagnostics`);
        expect(codeActions[1].title === `W501: Update disable diagnostics`);
    });

    it("Expect code actions to suggest updating ignore comments for all codes", async () => {
        const range = {
            start: Position.create(8, 34),
            end: Position.create(8, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                    Diagnostic.create(
                        range,
                        "Test",
                        undefined,
                        DiagnosticCode.missingReference
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(2);
        expect(codeActions[0].title === `E202: Update disable diagnostics`);
        expect(codeActions[1].title === `W501: Update disable diagnostics`);
    });
    it("Expect no ignore comment code action when existing non ignore comment on line", async () => {
        const range = {
            start: Position.create(17, 34),
            end: Position.create(17, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(0);
    });
    it("Expect no ignore comment code action when existing non ignore jinja comment on line", async () => {
        const range = {
            start: Position.create(21, 34),
            end: Position.create(21, 40),
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
                        DiagnosticCode.unknownCalc
                    ),
                ],
            },
        };
        const content = loadFile("codeActionIgnore.cnfg");
        const cnfg = parseSepticForTest(content);
        const doc = TextDocument.create("", "", 0, content);
        const codeActions = getCodeActionIgnoreDiagnostics(params, cnfg);
        expect(codeActions.length).to.equal(0);
    });
});
