import { Emitter, Event, TextDocuments, URI } from "vscode-languageserver";
import { ITextDocument } from "./language-service";

export interface IWorkspace {
  readonly onDidChangeCnfg: Event<ITextDocument>;

  readonly onDidOpenCnfg: Event<ITextDocument>;

  readonly onDidCloseCnfg: Event<URI>;
}

export class SepticWorkspace implements IWorkspace {
  readonly _onDidChangeCnfg = new Emitter<ITextDocument>();

  readonly onDidChangeCnfg = this._onDidChangeCnfg.event;

  readonly _onDidOpenCnfg = new Emitter<ITextDocument>();

  readonly onDidOpenCnfg = this._onDidOpenCnfg.event;

  readonly _onDidCloseCnfg = new Emitter<URI>();

  readonly onDidCloseCnfg = this._onDidCloseCnfg.event;

  constructor(documents: TextDocuments<ITextDocument>) {
    documents.onDidChangeContent((e) => {
      this._onDidChangeCnfg.fire(e.document);
    });
    documents.onDidOpen((e) => this._onDidOpenCnfg.fire(e.document));
    documents.onDidClose((e) => this._onDidCloseCnfg.fire(e.document.uri));
  }
}
