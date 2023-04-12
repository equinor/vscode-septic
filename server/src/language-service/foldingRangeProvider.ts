import * as lsp from "vscode-languageserver";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject } from "../parser";
import { SepticConfigProvider } from "./septicConfigProvider";

export class FoldingRangeProvider {
  private cnfgProvider: SepticConfigProvider;

  constructor(cnfgProvider: SepticConfigProvider) {
    this.cnfgProvider = cnfgProvider;
  }

  public provideFoldingRanges(
    doc: ITextDocument,
    token: lsp.CancellationToken
  ): lsp.FoldingRange[] {
    console.debug("Started providing folding ranges");
    let cnfg = this.cnfgProvider.get(doc.uri);
    if (!cnfg) {
      return [];
    }
    return getFoldingRanges(doc, cnfg, token);
  }
}

export function getFoldingRanges(
  doc: ITextDocument,
  cnfg: SepticCnfg,
  token: lsp.CancellationToken | undefined = undefined
): lsp.FoldingRange[] {
  let ranges: lsp.FoldingRange[] = [];

  for (let i = 0; i < cnfg.objects.length; i++) {
    let obj = cnfg.objects[i];
    let end = obj.end;
    let level = getLevel(obj);

    let j = i + 1;
    while (j < cnfg.objects.length) {
      if (token?.isCancellationRequested) {
        return [];
      }
      if (getLevel(cnfg.objects[j]) <= level) {
        break;
      }
      end = cnfg.objects[j].end;
      j += 1;
    }

    ranges.push({
      startLine: doc.positionAt(obj.start).line,
      endLine: doc.positionAt(end).line,
    });
  }

  return ranges;
}

const sectionLevelsMap = new Map<string, number>();

// Level 1
sectionLevelsMap.set("system", 1);
sectionLevelsMap.set("sopcproc", 1);
sectionLevelsMap.set("dummyappl", 1);
sectionLevelsMap.set("smpcappl", 1);
sectionLevelsMap.set("displaygroup", 1);

// Level 2
sectionLevelsMap.set("exprmodl", 2);
sectionLevelsMap.set("calcmodl", 2);
sectionLevelsMap.set("table", 2);
sectionLevelsMap.set("appl", 2);
sectionLevelsMap.set("spacer", 2);
sectionLevelsMap.set("heading", 2);
sectionLevelsMap.set("mvrlist", 2);
sectionLevelsMap.set("cvrlist", 2);
sectionLevelsMap.set("dvrlist", 2);
sectionLevelsMap.set("xvrplot", 2);
sectionLevelsMap.set("image", 2);
sectionLevelsMap.set("calctable", 2);
sectionLevelsMap.set("modelmatrix", 2);

//Level 3
sectionLevelsMap.set("imagestatuslabel", 3);
sectionLevelsMap.set("calcpvr", 3);

const maxLevel = 3;

// Level for variables
const REGEX_VARIABLE = /[a-zA-Z]+vr/;
const variableLevel = 2;

export function getLevel(obj: SepticObject): number {
  let type: string = obj.type.toLowerCase();

  let level = sectionLevelsMap.get(type);

  if (!level) {
    if (REGEX_VARIABLE.test(type)) {
      return variableLevel;
    }
    return maxLevel;
  }
  return level;
}
