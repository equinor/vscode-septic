/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { FoldingRangeProvider } from "./foldingRangeProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticConfigProvider } from "./septicConfigProvider";
import { DiagnosticProvider } from "./diagnosticsProvider";
import { DocumentSymbolProvider } from "./documentSymbolProvider";
import { SettingsManager } from "../settings";
import { CompletionProvider } from "./completionProvider";
import {
    LocationLinkOffset,
    LocationOffset,
    ReferenceProvider,
} from "./referenceProvider";
import { DocumentProvider } from "../documentProvider";
import { SepticCnfg, SepticReferenceProvider } from "../septic";
import { RenameProvider } from "./renameProvider";
import { HoverProvider } from "./hoverProvider";
import { FormattingProvider } from "./formatProvider";
import { SignatureHelpProvider } from "./signatureHelpProvider";
import { CodeActionProvider } from "./codeActionProvider";
import { CycleReportProvider } from "./cycleReportProvider";
import { generateOpcReport } from "./opctagListProvider";
import { CnfgComparisionProvider } from "./cnfgComparisonProvider";

export * from "./types/textDocument";

export interface ILanguageService {
    cnfgProvider: SepticConfigProvider;
    provideFoldingRanges(
        doc: ITextDocument,
    ): Promise<lsp.FoldingRange[]>;

    provideDiagnostics(
        uri: string,
        refProvider: SepticReferenceProvider
    ): Promise<lsp.Diagnostic[]>;

    provideDocumentSymbols(
        doc: ITextDocument,
    ): Promise<lsp.DocumentSymbol[]>;

    provideCompletion(
        pos: lsp.CompletionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<lsp.CompletionItem[]>;

    provideDefinition(
        params: lsp.DefinitionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationLinkOffset[]>;

    provideReferences(
        params: lsp.ReferenceParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationOffset[]>;

    provideDeclaration(
        params: lsp.DeclarationParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationLinkOffset[]>;

    provideRename(
        params: lsp.RenameParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<lsp.WorkspaceEdit | undefined>;

    providePrepareRename(
        params: lsp.PrepareRenameParams,
        doc: ITextDocument
    ): Promise<lsp.Range | null>;

    provideHover(
        params: lsp.HoverParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<lsp.Hover | undefined>;

    provideFormatting(doc: ITextDocument): Promise<lsp.TextEdit[]>;

    provideSignatureHelp(
        param: lsp.SignatureHelpParams,
        doc: ITextDocument
    ): Promise<lsp.SignatureHelp>;

    provideCodeAction(param: lsp.CodeActionParams): Promise<lsp.CodeAction[]>;

    provideCycleReport(
        name: string,
        refProvider: SepticReferenceProvider
    ): Promise<string>;

    provideCnfgComparison(
        prevVersion: SepticCnfg,
        currentVersion: SepticCnfg,
        settingsFile: string
    ): Promise<string>;

    provideOpcTagList(refProvider: SepticReferenceProvider): string;
}

export function createLanguageService(
    settingsManager: SettingsManager,
    documentProvider: DocumentProvider
) {
    const cnfgProvider = new SepticConfigProvider(documentProvider);
    const foldingRangeProvider = new FoldingRangeProvider(cnfgProvider);
    const diagnosticProvider = new DiagnosticProvider(
        cnfgProvider,
        documentProvider,
        settingsManager
    );

    const documentSymbolProvider = new DocumentSymbolProvider(cnfgProvider);

    const completionProvider = new CompletionProvider(cnfgProvider, settingsManager);

    const referenceProvider = new ReferenceProvider(cnfgProvider);

    const renameProvider = new RenameProvider(cnfgProvider, documentProvider);

    const hoverProvider = new HoverProvider(cnfgProvider);

    const formattingProvider = new FormattingProvider(cnfgProvider);

    const signatureHelpProvider = new SignatureHelpProvider(cnfgProvider);

    const codeActionProvider = new CodeActionProvider(
        cnfgProvider,
        settingsManager,
        documentProvider
    );

    const cycleReportProvider = new CycleReportProvider(documentProvider);

    const cnfgComparisionProvider = new CnfgComparisionProvider(
        documentProvider
    );

    return Object.freeze<ILanguageService>({
        cnfgProvider,
        provideFoldingRanges:
            foldingRangeProvider.provideFoldingRanges.bind(
                foldingRangeProvider
            ),
        provideDiagnostics:
            diagnosticProvider.provideDiagnostics.bind(diagnosticProvider),
        provideDocumentSymbols:
            documentSymbolProvider.provideDocumentSymbols.bind(
                documentSymbolProvider
            ),
        provideCompletion:
            completionProvider.provideCompletion.bind(completionProvider),
        provideDefinition:
            referenceProvider.provideDefinition.bind(referenceProvider),
        provideReferences:
            referenceProvider.provideReferences.bind(referenceProvider),
        provideDeclaration:
            referenceProvider.provideDeclaration.bind(referenceProvider),
        provideRename: renameProvider.provideRename.bind(renameProvider),
        providePrepareRename:
            renameProvider.providePrepareRename.bind(renameProvider),
        provideHover: hoverProvider.provideHover.bind(hoverProvider),
        provideFormatting:
            formattingProvider.provideFormatting.bind(formattingProvider),
        provideSignatureHelp: signatureHelpProvider.provideSignatureHelp.bind(
            signatureHelpProvider
        ),
        provideCodeAction:
            codeActionProvider.provideCodeAction.bind(codeActionProvider),
        provideCycleReport:
            cycleReportProvider.generateCycleReport.bind(cycleReportProvider),
        provideOpcTagList: generateOpcReport,
        provideCnfgComparison: cnfgComparisionProvider.compareCnfgs.bind(
            cnfgComparisionProvider
        )
    });
}
