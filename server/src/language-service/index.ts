import * as lsp from "vscode-languageserver";
import { FoldingRangeProvider } from "./foldingRangeProvider";
import { ITextDocument } from "./types/textDocument";
import { IWorkspace } from "../workspace";
import { SepticConfigProvider } from "./septicConfigProvider";
import { DiagnosticProvider } from "./diagnosticsProvider";
import { DocumentSymbolProvider } from "./documentSymbolProvider";

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
}

export function createLanguageService(workspace: IWorkspace) {
  const cnfgProvider = new SepticConfigProvider(workspace);
  const foldingRangeProvider = new FoldingRangeProvider(cnfgProvider);
  const diagnosticProvider = new DiagnosticProvider(cnfgProvider, {
    missingVariables: true,
  });
  const documentSymbolProvider = new DocumentSymbolProvider(cnfgProvider);

  return Object.freeze<ILanguageService>({
    provideFoldingRanges:
      foldingRangeProvider.provideFoldingRanges.bind(foldingRangeProvider),
    provideDiagnostics:
      diagnosticProvider.provideDiagnostics.bind(diagnosticProvider),
    provideDocumentSymbols: documentSymbolProvider.provideDocumentSymbols.bind(
      documentSymbolProvider
    ),
  });
}
