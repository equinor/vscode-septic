/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    Diagnostic,
    Position,
    Range,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "../configProvider";
import { ITextDocument } from "../types/textDocument";
import {
    SepticCnfg,
    SepticComment,
    SepticObject,
    SepticTokenType,
} from "../septic";
import { DiagnosticCode, disableDiagnosticRegex } from "./diagnosticsProvider";
import { WorkspaceEditBuilder } from "../util/editBuilder";
import { SettingsManager } from "../settings";
import { DocumentProvider } from "../documentProvider";

export class CodeActionProvider {
    private readonly cnfgProvider: SepticConfigProvider;
    private readonly settingsManager: SettingsManager;
    private readonly documentProvider: DocumentProvider;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: SepticConfigProvider,
        settingsManager: SettingsManager,
        documentProvider: DocumentProvider
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
        this.documentProvider = documentProvider;
    }

    /* istanbul ignore next */
    public async provideCodeAction(
        params: CodeActionParams
    ): Promise<CodeAction[]> {
        const codeActions: CodeAction[] = [];
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        const settings = await this.settingsManager.getSettings();
        const insertPos = settings?.codeActions.insertEvrPosition ?? "bottom";
        const insertEvrActions = await this.createCodeActionsInsertEvr(
            getCodeActionInsertEvr(params, cnfg, insertPos)
        );
        codeActions.push(...insertEvrActions);
        codeActions.push(...getCodeActionIgnoreDiagnostics(params, cnfg));
        codeActions.push(...getCodeActionGenerateCalc(params, cnfg));
        return codeActions;
    }

    /* istanbul ignore next */
    private async createCodeActionsInsertEvr(
        codeActionsInsert: CodeActionInsert[]
    ) {
        const codeActions = [];
        for (const cai of codeActionsInsert) {
            const doc = await this.documentProvider.getDocument(cai.uri);
            if (!doc) {
                continue;
            }
            codeActions.push(createCodeActionInsertEvr(cai, doc));
        }
        return codeActions;
    }
}

export interface CodeActionInsert {
    name: string;
    uri: string;
    offset: number;
    diag: Diagnostic;
}

export function getCodeActionInsertEvr(
    params: CodeActionParams,
    cnfg: SepticCnfg,
    insertEvrPos: "top" | "bottom"
): CodeActionInsert[] {
    const diag = params.context.diagnostics.find(
        (diag) => diag.code === DiagnosticCode.missingReference
    );
    if (!diag) {
        return [];
    }
    const currentObject = cnfg.findObjectFromLocation(
        params.range.start
    );
    if (!currentObject?.isType("CalcPvr")) {
        return [];
    }
    const referencedVariable = cnfg.findReferenceFromLocation(
        params.range.start
    );
    if (!referencedVariable) {
        return [];
    }
    const dmmyAppl = getDmmyApplAncestor(currentObject);
    if (!dmmyAppl) {
        return [];
    }
    const insertPos = getInsertOffsetAndUri(dmmyAppl, insertEvrPos);
    if (!insertPos) {
        return [];
    }
    return [
        {
            name: referencedVariable.identifier,
            uri: insertPos.uri,
            offset: insertPos.offset,
            diag: diag,
        },
    ];
}

function getDmmyApplAncestor(obj: SepticObject): undefined | SepticObject {
    let parent = obj.parent;
    while (parent && !parent.isType("DmmyAppl")) {
        parent = parent.parent;
    }
    return parent;
}

function getInsertOffsetAndUri(
    dmmyAppl: SepticObject,
    insertPos: "top" | "bottom"
): undefined | { offset: number; uri: string } {
    if (insertPos === "top") {
        return { offset: dmmyAppl.end, uri: dmmyAppl.uri };
    }
    let objectBeforeInsert = dmmyAppl;
    for (const child of dmmyAppl.children) {
        if (child.isType("CalcModl")) {
            return {
                offset: objectBeforeInsert.end,
                uri: objectBeforeInsert.uri,
            };
        }
        objectBeforeInsert = child;
    }
    return undefined;
}

export function getCodeActionIgnoreDiagnostics(
    params: CodeActionParams,
    cnfg: SepticCnfg
): CodeAction[] {
    const codeActions: CodeAction[] = [];
    if (
        !isOnlyIgnoreCommentsOnSameLine(cnfg.comments, params.range.start, cnfg)
    ) {
        return codeActions;
    }
    const comment = getIgnoreCommentSameLine(
        params.range.start,
        cnfg.comments,
        cnfg
    );
    const codes = [
        ...new Set(params.context.diagnostics.filter((diag) => diag.code).map((diag) => diag.code)),
    ];
    for (const code of codes) {
        const applicableDiagnostics = params.context.diagnostics.filter(
            (diag) => diag.code === code
        );
        if (comment) {
            codeActions.push(
                createCodeActionUpdateIgnoreComment(
                    code!.toString(),
                    comment,
                    applicableDiagnostics,
                    cnfg
                )
            );
        } else {
            codeActions.push(
                ...createCodeActionInsertIgnoreComment(
                    code!.toString(),
                    params.range.start,
                    applicableDiagnostics,
                    cnfg
                )
            );
        }
    }
    return codeActions;
}

export function getCodeActionGenerateCalc(params: CodeActionParams, cnfg: SepticCnfg): CodeAction[] {
    const codeActions = []
    const start = cnfg.offsetAt(params.range.start);
    const end = cnfg.offsetAt(params.range.end);
    const objects = cnfg.getObjectsInRange(start, end).filter(obj => obj.isType("CalcPvr"));
    for (const obj of objects) {
        const algAttr = obj.getAttribute("Alg");
        const textAttr = obj.getAttribute("Text1");
        if (algAttr?.getFirstValue() === undefined || textAttr?.getFirstValue() === undefined) {
            continue;
        }
        if (textAttr.getFirstValue() === "") {
            continue;
        }
        const start = cnfg.positionAt(algAttr.getFirstAttributeValueObject()!.start + 1);
        const end = cnfg.positionAt(algAttr.getFirstAttributeValueObject()!.end - 1);
        const codeAction = CodeAction.create(`Generate Calc: ${obj.identifier?.name}`);
        codeAction.kind = CodeActionKind.QuickFix;
        codeAction.command = Command.create(`Generate calc`, "septic.generateCalc", textAttr.getFirstValue(), start, end);
        codeActions.push(codeAction);

    }
    return codeActions;
}


function isOnlyIgnoreCommentsOnSameLine(
    comments: SepticComment[],
    pos: Position,
    doc: ITextDocument
) {
    return (
        comments.filter(
            (comment) =>
                doc.positionAt(comment.start).line === pos.line &&
                !disableDiagnosticRegex.test(comment.content)
        ).length === 0
    );
}

function getIgnoreCommentSameLine(
    pos: Position,
    comments: SepticComment[],
    doc: ITextDocument
): undefined | SepticComment {
    return comments.find(
        (comment) =>
            doc.positionAt(comment.start).line === pos.line &&
            disableDiagnosticRegex.test(comment.content)
    );
}

function createCodeActionInsertIgnoreComment(
    code: string,
    pos: Position,
    diagnostics: Diagnostic[],
    doc: ITextDocument
): CodeAction[] {
    const codeActionJinja = CodeAction.create(
        `${code}: Disable with {# noqa: .... #}`
    );
    codeActionJinja.diagnostics = diagnostics;
    codeActionJinja.kind = CodeActionKind.QuickFix;
    codeActionJinja.edit = createCodeActionInsertIgnoreCommentEdit(
        `  {# noqa: ${code} #}`,
        pos,
        doc
    );
    const codeAction = CodeAction.create(`${code}: Disable with // noqa: ....`);
    codeAction.diagnostics = diagnostics;
    codeAction.kind = CodeActionKind.QuickFix;
    codeAction.edit = createCodeActionInsertIgnoreCommentEdit(
        `  // noqa: ${code}`,
        pos,
        doc
    );
    return [codeActionJinja, codeAction];
}

function createCodeActionInsertIgnoreCommentEdit(
    text: string,
    pos: Position,
    doc: ITextDocument
) {
    const editBuilder = new WorkspaceEditBuilder();
    editBuilder.insert(doc.uri, Position.create(pos.line, 9999), text);
    return editBuilder.getEdit();
}

function createCodeActionUpdateIgnoreComment(
    code: string,
    comment: SepticComment,
    diagnostics: Diagnostic[],
    doc: ITextDocument
): CodeAction {
    const codeAction = CodeAction.create(`${code}: Update disable diagnostics`);
    codeAction.diagnostics = diagnostics;
    codeAction.kind = CodeActionKind.QuickFix;
    codeAction.edit = createUpdateIgnoreCommentEdit(code, comment, doc);
    return codeAction;
}

function createUpdateIgnoreCommentEdit(
    code: string,
    comment: SepticComment,
    doc: ITextDocument
): WorkspaceEdit {
    const match = comment.content.match(disableDiagnosticRegex);
    const existingCodes = (match![1] ?? match![2])
        .split(",")
        .map((code) => code.trim());
    const editBuilder = new WorkspaceEditBuilder();
    let text = "";
    if (comment.type === SepticTokenType.jinjaComment) {
        text = `{# noqa: ${[...existingCodes, code].join(", ")} #}`;
    } else {
        text = `// noqa: ${[...existingCodes, code].join(", ")}`;
    }
    editBuilder.replace(
        doc.uri,
        Range.create(
            doc.positionAt(comment.start),
            doc.positionAt(comment.end)
        ),
        text
    );
    return editBuilder.getEdit();
}

function createCodeActionInsertEvr(
    action: CodeActionInsert,
    doc: ITextDocument
): CodeAction {
    const codeAction = CodeAction.create("Insert Evr");
    codeAction.diagnostics = [action.diag];
    codeAction.isPreferred = true;
    codeAction.kind = CodeActionKind.QuickFix;
    codeAction.edit = createInsertEvrEdit(action.name, action.offset, doc);
    return codeAction;
}

function createInsertEvrEdit(
    name: string,
    offset: number,
    doc: ITextDocument
): WorkspaceEdit {
    const editBuilder = new WorkspaceEditBuilder();
    const text = getTextEvr(name);
    editBuilder.insert(doc.uri, doc.positionAt(offset), text);
    return editBuilder.getEdit();
}

function getTextEvr(name: string) {
    const textList = [
        "\n",
        `  Evr:           ${name}`,
        '         Text1=  ""',
        '         Text2=  ""',
        "       PlotMax=  100",
        "       PlotMin=  0",
        "      PlotSpan=  -1",
        "          Nfix=  2",
        '          Unit=  ""',
        "       GrpMask=  0000000000000000000000000000001",
        "       GrpType=  0000000000000000000000000000000",
        "          Span=  10",
        "          Meas=  0",
        "     UserInput=  OFF",
        "    UserAccess=  WRRR",
        "      MinInput=  0",
        "      MaxInput=  0",
        "ValidationLimit=  -1",
        "         Color=  BLACK",
    ];
    return textList.join("\n");
}
