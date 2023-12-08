import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Diagnostic,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject } from "../septic";
import { DiagnosticCode } from "./diagnosticsProvider";
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
        let codeActionsInsert: CodeActionInsert[] = [];
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
        codeActionsInsert.push(
            ...getCodeActionInsertEvr(params, cnfg, doc, insertPos)
        );
        return this.createCodeActions(codeActionsInsert);
    }

    /* istanbul ignore next */
    private async createCodeActions(codeActionsInsert: CodeActionInsert[]) {
        let codeActions = [];
        for (let cai of codeActionsInsert) {
            let doc = await this.documentProvider.getDocument(cai.uri);
            if (!doc) {
                continue;
            }
            switch (cai.type) {
                case CodaActionInsertType.evr:
                    codeActions.push(createCodeActionInsertEvr(cai, doc));
                default:
                    continue;
            }
        }
        return codeActions;
    }
}

enum CodaActionInsertType {
    evr,
}
export interface CodeActionInsert {
    name: string;
    uri: string;
    offset: number;
    diag: Diagnostic;
    type: CodaActionInsertType;
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
            type: CodaActionInsertType.evr,
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
