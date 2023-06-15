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
import { SepticReferenceProvider } from "../septic";
import { RenameProvider } from "./renameProvider";
import { HoverProvider } from "./hoverProvider";
import { FormattingProvider } from "./formatProvider";

export * from "./types/textDocument";

export interface ILanguageService {
    cnfgProvider: SepticConfigProvider;
    provideFoldingRanges(
        doc: ITextDocument,
        token: lsp.CancellationToken | undefined
    ): Promise<lsp.FoldingRange[]>;

    provideDiagnostics(
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<lsp.Diagnostic[]>;

    provideDocumentSymbols(
        doc: ITextDocument,
        token: lsp.CancellationToken | undefined
    ): Promise<lsp.DocumentSymbol[]>;

    provideCompletion(
        pos: lsp.TextDocumentPositionParams,
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
}

export function createLanguageService(
    configurationManager: SettingsManager,
    documentProvider: DocumentProvider
) {
    const cnfgProvider = new SepticConfigProvider(documentProvider);
    const foldingRangeProvider = new FoldingRangeProvider(cnfgProvider);
    const diagnosticProvider = new DiagnosticProvider(
        cnfgProvider,
        configurationManager
    );

    const documentSymbolProvider = new DocumentSymbolProvider(cnfgProvider);

    const completionProvider = new CompletionProvider(cnfgProvider);

    const referenceProvider = new ReferenceProvider(cnfgProvider);

    const renameProvider = new RenameProvider(cnfgProvider, documentProvider);

    const hoverProvider = new HoverProvider(cnfgProvider);

    const formattingProvider = new FormattingProvider(cnfgProvider);

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
    });
}
