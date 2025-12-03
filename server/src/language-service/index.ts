/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { FoldingRangeProvider } from "./foldingRangeProvider";
import { SepticConfigProvider } from "../configProvider";
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
import { SepticCnfg, SepticContext } from "../septic";
import { RenameProvider } from "./renameProvider";
import { HoverProvider } from "./hoverProvider";
import { FormattingProvider } from "./formatProvider";
import { SignatureHelpProvider } from "./signatureHelpProvider";
import { CodeActionProvider } from "./codeActionProvider";
import { CycleReportProvider } from "./cycleReportProvider";
import { generateOpcReport } from "./opctagListProvider";
import { CnfgComparisionProvider } from "./cnfgComparisonProvider";

export interface ILanguageService {
    cnfgProvider: SepticConfigProvider;
    provideFoldingRanges(
        params: lsp.FoldingRangeParams
    ): Promise<lsp.FoldingRange[]>;

    provideDiagnostics(
        uri: string,
        contextProvider: SepticContext
    ): Promise<lsp.Diagnostic[]>;

    provideDocumentSymbols(
        params: lsp.DocumentSymbolParams
    ): Promise<lsp.DocumentSymbol[]>;

    provideCompletion(
        pos: lsp.CompletionParams,
        contextProvider: SepticContext
    ): Promise<lsp.CompletionItem[]>;

    provideDefinition(
        params: lsp.DefinitionParams,
        contextProvider: SepticContext
    ): Promise<LocationLinkOffset[]>;

    provideReferences(
        params: lsp.ReferenceParams,
        contextProvider: SepticContext
    ): Promise<LocationOffset[]>;

    provideDeclaration(
        params: lsp.DeclarationParams,
        contextProvider: SepticContext
    ): Promise<LocationLinkOffset[]>;

    provideRename(
        params: lsp.RenameParams,
        contextProvider: SepticContext
    ): Promise<lsp.WorkspaceEdit | undefined>;

    providePrepareRename(
        params: lsp.PrepareRenameParams
    ): Promise<lsp.Range | null>;

    provideHover(
        params: lsp.HoverParams,
        contextProvider: SepticContext
    ): Promise<lsp.Hover | undefined>;

    provideFormatting(
        params: lsp.DocumentFormattingParams
    ): Promise<lsp.TextEdit[]>;

    provideSignatureHelp(
        param: lsp.SignatureHelpParams
    ): Promise<lsp.SignatureHelp>;

    provideCodeAction(param: lsp.CodeActionParams): Promise<lsp.CodeAction[]>;

    provideCycleReport(
        name: string,
        contextProvider: SepticContext
    ): Promise<string>;

    provideCnfgComparison(
        prevVersion: SepticCnfg,
        currentVersion: SepticCnfg,
        settingsFile: string
    ): Promise<string>;

    provideOpcTagList(contextProvider: SepticContext): string;
}

export function createLanguageService(
    settingsManager: SettingsManager,
    documentProvider: DocumentProvider
) {
    const cnfgProvider = new SepticConfigProvider(documentProvider);
    const foldingRangeProvider = new FoldingRangeProvider(cnfgProvider);
    const diagnosticProvider = new DiagnosticProvider(
        cnfgProvider,
        settingsManager
    );

    const documentSymbolProvider = new DocumentSymbolProvider(cnfgProvider);

    const completionProvider = new CompletionProvider(
        cnfgProvider,
        settingsManager
    );

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
        ),
    });
}
