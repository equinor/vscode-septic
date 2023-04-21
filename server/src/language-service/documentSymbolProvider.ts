import {
  CancellationToken,
  DocumentSymbol,
  SymbolKind,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject } from "../parser";
import { SettingsManager } from "../settings";
import {
  HierarchySettings,
  defaultHierarchySettings,
  getHierarchyLevel,
} from "../util";

interface SepticSymbol {
  symbol: DocumentSymbol;
  level: number;
  parent: SepticSymbol | undefined;
}

export class DocumentSymbolProvider {
  private readonly cnfgProvider: ISepticConfigProvider;
  private readonly settingsManager: SettingsManager;

  constructor(
    cnfgProvider: ISepticConfigProvider,
    settingsManager: SettingsManager
  ) {
    this.cnfgProvider = cnfgProvider;
    this.settingsManager = settingsManager;
  }

  public provideDocumentSymbols(
    document: ITextDocument,
    token: CancellationToken | undefined
  ): DocumentSymbol[] {
    const cnfg = this.cnfgProvider.get(document.uri);
    if (!cnfg) {
      return [];
    }
    const settings =
      this.settingsManager.getSettings()?.hierarchy ?? defaultHierarchySettings;
    return getDocumentSymbols(document, cnfg, settings);
  }
}

export function getDocumentSymbols(
  doc: ITextDocument,
  cnfg: SepticCnfg,
  settings: HierarchySettings
) {
  let symbols = cnfg.objects.map((obj) => {
    return createSepticSymbol(obj, doc, settings);
  });

  let root = {
    level: -1,
    parent: undefined,
    symbol: dummySymbol(),
  };

  buildTree(root, symbols);

  return root.symbol.children!;
}

function buildTree(parent: SepticSymbol, symbols: SepticSymbol[]) {
  if (!symbols.length) {
    return;
  }

  let symbol = symbols[0];

  while (parent && symbol.level <= parent.level) {
    parent = parent.parent!;
  }

  parent.symbol.children?.push(symbol.symbol);
  symbol.parent = parent;

  buildTree(symbol, symbols.slice(1));
}

function createSepticSymbol(
  obj: SepticObject,
  doc: ITextDocument,
  settings: HierarchySettings
): SepticSymbol {
  let name = obj.name + ": " + obj.variable?.name;
  let symbolKind = getSymbolKind(obj.name);
  let range = {
    start: doc.positionAt(obj.start),
    end: doc.positionAt(obj.end),
  };
  let level = getHierarchyLevel(obj, settings);
  return {
    symbol: DocumentSymbol.create(
      name,
      undefined,
      symbolKind,
      range,
      range,
      []
    ),
    level: level,
    parent: undefined,
  };
}

function dummySymbol(): DocumentSymbol {
  let range = {
    start: { character: 0, line: 0 },
    end: { character: 0, line: 0 },
  };
  return DocumentSymbol.create(
    "",
    undefined,
    SymbolKind.Array,
    range,
    range,
    []
  );
}

function getSymbolKind(type: string) {
  if (
    ["sopcmvr", "sopccvr", "sopctvr", "sopcevr"].includes(type.toLowerCase())
  ) {
    return SymbolKind.Interface;
  } else if (["mvr", "cvr", "tvr", "evr", "dvr"].includes(type.toLowerCase())) {
    return SymbolKind.Variable;
  } else if (["calcpvr"].includes(type.toLowerCase())) {
    return SymbolKind.Function;
  } else {
    return SymbolKind.Object;
  }
}
