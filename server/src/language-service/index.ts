import * as lsp from "vscode-languageserver";
import { getFoldingRanges } from "./folding";
import { ITextDocument } from "./types/textDocument";

export * from "./types/textDocument";

export interface ILanguageService {
  getFoldingRanges(
    doc: ITextDocument,
    token: lsp.CancellationToken
  ): lsp.FoldingRange[];
}

export function createLanguageService() {
  return Object.freeze<ILanguageService>({
    getFoldingRanges: getFoldingRanges,
  });
}
