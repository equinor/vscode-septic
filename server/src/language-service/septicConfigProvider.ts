import {
  CancellationToken,
  CancellationTokenSource,
  URI,
} from "vscode-languageserver";
import { SepticCnfg, parseSeptic } from "../parser";
import { ResourceMap } from "../util/resourceMap";
import { IWorkspace } from "../workspace";
import { ITextDocument } from ".";
import { Lazy, lazy } from "../util/lazy";

export interface ISepticConfigProvider {
  get(resource: URI): SepticCnfg | undefined;
}

type GetValueFn = (
  document: ITextDocument,
  token: CancellationToken
) => SepticCnfg;

function getValueCnfg(
  document: ITextDocument,
  token: CancellationToken
): SepticCnfg {
  const text = document.getText();

  return parseSeptic(text, token);
}

export class SepticConfigProvider implements ISepticConfigProvider {
  private readonly cache = new ResourceMap<{
    value: Lazy<SepticCnfg>;
    cts: CancellationTokenSource;
  }>();

  readonly getValue;

  constructor(workspace: IWorkspace, getValue: GetValueFn = getValueCnfg) {
    this.getValue = getValue;

    workspace.onDidChangeCnfg((doc) => this.update(doc));
    workspace.onDidOpenCnfg((doc) => this.update(doc));
    workspace.onDidCloseCnfg((uri) => this.onDidClose(uri));
  }

  public get(resource: URI): SepticCnfg | undefined {
    let existing = this.cache.get(resource);
    if (existing) {
      return existing.value.value;
    }
    return undefined;
  }

  private update(document: ITextDocument) {
    const existing = this.cache.get(document.uri);
    if (existing) {
      existing.cts.cancel();
      existing.cts.dispose();
    }

    let cts = new CancellationTokenSource();

    this.cache.set(document.uri, {
      value: lazy<SepticCnfg>(() => this.getValue(document, cts.token)),
      cts: cts,
    });
  }

  private onDidClose(resource: URI) {
    const entry = this.cache.get(resource);
    if (entry) {
      entry.cts.cancel();
      entry.cts.dispose();
      this.cache.delete(resource);
    }
  }
}
