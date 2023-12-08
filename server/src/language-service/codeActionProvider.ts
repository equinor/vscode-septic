import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Diagnostic,
    Position,
    Range,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
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
        let codeActions: CodeAction[] = [];
        let doc = await this.documentProvider.getDocument(
            params.textDocument.uri
        );
        if (!doc) {
            return [];
        }
        let cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        let settings = await this.settingsManager.getSettings();
        let insertPos = settings?.codeActions.insertEvrPosition ?? "bottom";
        let insertEvrActions = await this.createCodeActionsInsertEvr(
            getCodeActionInsertEvr(params, cnfg, doc, insertPos)
        );
        codeActions.push(...insertEvrActions);
        codeActions.push(...getCodeActionIgnoreDiagnostics(params, cnfg, doc));
        return codeActions;
    }

    /* istanbul ignore next */
    private async createCodeActionsInsertEvr(
        codeActionsInsert: CodeActionInsert[]
    ) {
        let codeActions = [];
        for (let cai of codeActionsInsert) {
            let doc = await this.documentProvider.getDocument(cai.uri);
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
    doc: ITextDocument,
    insertEvrPos: "top" | "bottom"
): CodeActionInsert[] {
    let diag = params.context.diagnostics.find(
        (diag) => diag.code === DiagnosticCode.missingReference
    );
    if (!diag) {
        return [];
    }
    let currentObject = cnfg.getObjectFromOffset(
        doc.offsetAt(params.range.start)
    );
    if (!currentObject?.isType("CalcPvr")) {
        return [];
    }
    let referencedVariable = cnfg.getXvrRefFromOffset(
        doc.offsetAt(params.range.start)
    );
    if (!referencedVariable) {
        return [];
    }
    let dmmyAppl = getDmmyApplAncestor(currentObject);
    if (!dmmyAppl) {
        return [];
    }
    let insertPos = getInsertOffsetAndUri(dmmyAppl, insertEvrPos);
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
    cnfg: SepticCnfg,
    doc: ITextDocument
): CodeAction[] {
    let codeActions: CodeAction[] = [];
    if (
        !isOnlyIgnoreCommentsOnSameLine(cnfg.comments, params.range.start, doc)
    ) {
        return codeActions;
    }
    let comment = getIgnoreCommentSameLine(
        params.range.start,
        cnfg.comments,
        doc
    );
    let codes = [
        ...new Set(params.context.diagnostics.map((diag) => diag.code)),
    ];
    for (let code of codes) {
        let applicableDiagnostics = params.context.diagnostics.filter(
            (diag) => diag.code === code
        );
        if (comment) {
            codeActions.push(
                createCodeActionUpdateIgnoreComment(
                    code!.toString(),
                    comment,
                    applicableDiagnostics,
                    doc
                )
            );
        } else {
            codeActions.push(
                ...createCodeActionInsertIgnoreComment(
                    code!.toString(),
                    params.range.start,
                    applicableDiagnostics,
                    doc
                )
            );
        }
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
    let codeActionJinja = CodeAction.create(
        `${code}: Disable with {# noqa: .... #}`
    );
    codeActionJinja.diagnostics = diagnostics;
    codeActionJinja.kind = CodeActionKind.QuickFix;
    codeActionJinja.edit = createCodeActionInsertIgnoreCommentEdit(
        `  {# noqa: ${code} #}`,
        pos,
        doc
    );
    let codeAction = CodeAction.create(`${code}: Disable with // noqa: ....`);
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
    let editBuilder = new WorkspaceEditBuilder();
    editBuilder.insert(doc.uri, Position.create(pos.line, 9999), text);
    return editBuilder.getEdit();
}

function createCodeActionUpdateIgnoreComment(
    code: string,
    comment: SepticComment,
    diagnostics: Diagnostic[],
    doc: ITextDocument
): CodeAction {
    let codeAction = CodeAction.create(`${code}: Update disable diagnostics`);
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
    let match = comment.content.match(disableDiagnosticRegex);
    let existingCodes = (match![1] ?? match![2])
        .split(",")
        .map((code) => code.trim());
    let editBuilder = new WorkspaceEditBuilder();
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
    let codeAction = CodeAction.create("Insert Evr");
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
    let editBuilder = new WorkspaceEditBuilder();
    let text = getTextEvr(name);
    editBuilder.insert(doc.uri, doc.positionAt(offset), text);
    return editBuilder.getEdit();
}

function getTextEvr(name: string) {
    let textList = [
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
