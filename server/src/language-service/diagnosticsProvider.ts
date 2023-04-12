import {
  CancellationToken,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg } from "../parser";

export interface IDiagnosticsOptions {
  missingVariables?: boolean;
}

type DiagnosticFn = (cnfg: SepticCnfg, doc: ITextDocument) => Diagnostic[];

export class DiagnosticProvider {
  private readonly cnfgProvider: ISepticConfigProvider;
  private readonly validationFunctions: DiagnosticFn[] = [];

  constructor(
    cnfgProvider: ISepticConfigProvider,
    options: IDiagnosticsOptions
  ) {
    this.cnfgProvider = cnfgProvider;
    if (options.missingVariables) {
      this.validationFunctions.push(missingVariableDiagnostic);
    }
  }

  public provideDiagnostics(
    doc: ITextDocument,
    token: CancellationToken | undefined = undefined
  ): Diagnostic[] {
    const cnfg = this.cnfgProvider.get(doc.uri);
    if (cnfg === undefined) {
      return [];
    }
    const diagnostics: Diagnostic[] = [];

    for (let i = 0; i < this.validationFunctions.length; i++) {
      if (token?.isCancellationRequested) {
        return [];
      }
      let fn = this.validationFunctions[i];
      let localDiag = fn(cnfg, doc);
      diagnostics.push(...localDiag);
    }

    return diagnostics;
  }
}

function missingVariableDiagnostic(
  cnfg: SepticCnfg,
  doc: ITextDocument
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  cnfg.objects.forEach((elem) => {
    if (!elem.variable) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: doc.positionAt(elem.start),
          end: doc.positionAt(elem.start + elem.type.length),
        },
        message: "Missing Variable for Septic Object",
      };
      diagnostics.push(diagnostic);
    }
  });

  return diagnostics;
}
