import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Diagnostic,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticReferenceProvider } from "../septic";
import { DiagnosticCode } from "./diagnosticsProvider";
import { WorkspaceEditBuilder } from "../util/editBuilder";
import { SettingsManager } from "../settings";

export class CodeActionProvider {
    private readonly cnfgProvider: SepticConfigProvider;
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: SepticConfigProvider,
        settingsManager: SettingsManager
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideCodeAction(
        params: CodeActionParams,
        doc: ITextDocument
    ): Promise<CodeActionInsertEvr[]> {
        let cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        let settings = await this.settingsManager.getSettings();
        let insertPos = settings?.codeActions.insertEvrPosition ?? "bottom";
        return getCodeActionInsertEvr(params, cnfg, doc, insertPos);
    }
}

export interface CodeActionInsertEvr {
    name: string;
    uri: string;
    offsetEdit: number;
    diag: Diagnostic;
}

export function getCodeActionInsertEvr(
    params: CodeActionParams,
    cnfg: SepticCnfg,
    doc: ITextDocument,
    insertEvrPos: "top" | "bottom"
): CodeActionInsertEvr[] {
    let diag = getReferenceError(params.context.diagnostics);
    if (!diag) {
        return [];
    }
    let currentObject = cnfg.getObjectFromOffset(
        doc.offsetAt(params.range.start)
    );
    if (!currentObject?.isType("CalcPvr")) {
        return [];
    }
    let parent = currentObject.parent;
    if (!parent?.isType("CalcModl")) {
        return [];
    }
    while (parent && !parent.isType("DmmyAppl")) {
        parent = parent.parent;
    }
    if (!parent) {
        return [];
    }
    let objectBeforeInsert = parent;
    if (insertEvrPos === "bottom") {
        for (const child of parent.children) {
            if (child.isType("CalcModl")) {
                break;
            }
            objectBeforeInsert = child;
        }
    }
    let referencedVariable = cnfg.getXvrRefFromOffset(
        doc.offsetAt(params.range.start)
    );
    if (!referencedVariable) {
        return [];
    }
    return [
        {
            name: referencedVariable.identifier,
            uri: objectBeforeInsert.uri,
            offsetEdit: objectBeforeInsert.end,
            diag: diag,
        },
    ];
}

function getReferenceError(diagnostics: Diagnostic[]): Diagnostic | undefined {
    for (const diag of diagnostics) {
        if (diag.code === DiagnosticCode.missingReference) {
            return diag;
        }
    }
    return undefined;
}

export function createCodeActionInsertEvr(
    action: CodeActionInsertEvr,
    doc: ITextDocument
): CodeAction {
    let codeAction = CodeAction.create("Insert Evr");
    codeAction.diagnostics = [action.diag];
    codeAction.isPreferred = true;
    codeAction.kind = CodeActionKind.QuickFix;
    codeAction.edit = createInsertEvrEdit(action.name, action.offsetEdit, doc);
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
