/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { FoldingRangeProvider } from "./foldingRangeProvider";
import { ITextDocument } from "./types/textDocument";
import { IWorkspace } from "../workspace";
import { SepticConfigProvider } from "./septicConfigProvider";
import { DiagnosticProvider } from "./diagnosticsProvider";
import { DocumentSymbolProvider } from "./documentSymbolProvider";
import { SettingsManager } from "../settings";
import { CompletionProvider } from "./completionProvider";
import { ReferenceProvider } from "./referenceProvider";

export * from "./types/textDocument";

export interface ILanguageService {
    provideFoldingRanges(
        doc: ITextDocument,
        token: lsp.CancellationToken | undefined
    ): lsp.FoldingRange[];

    provideDiagnostics(
        doc: ITextDocument,
        token: lsp.CancellationToken | undefined
    ): lsp.Diagnostic[];

    provideDocumentSymbols(
        doc: ITextDocument,
        token: lsp.CancellationToken | undefined
    ): lsp.DocumentSymbol[];

    provideCompletion(
        pos: lsp.TextDocumentPositionParams,
        doc: ITextDocument
    ): lsp.CompletionItem[];

    provideDefinition(
        params: lsp.DefinitionParams,
        doc: ITextDocument
    ): lsp.LocationLink[];

    provideReferences(
        params: lsp.ReferenceParams,
        doc: ITextDocument
    ): lsp.Location[];

    provideDeclaration(
        params: lsp.DeclarationParams,
        doc: ITextDocument
    ): lsp.LocationLink[];
}

export function createLanguageService(
    workspace: IWorkspace,
    configurationManager: SettingsManager
) {
    const cnfgProvider = new SepticConfigProvider(workspace);
    const foldingRangeProvider = new FoldingRangeProvider(cnfgProvider);
    const diagnosticProvider = new DiagnosticProvider(
        cnfgProvider,
        configurationManager
    );

    const documentSymbolProvider = new DocumentSymbolProvider(cnfgProvider);

    const completionProvider = new CompletionProvider(cnfgProvider);

    const referenceProvider = new ReferenceProvider(cnfgProvider);

    return Object.freeze<ILanguageService>({
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
    });
}
