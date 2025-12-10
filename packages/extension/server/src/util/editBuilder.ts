/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-markdown-languageservice]
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver-types";

export class WorkspaceEditBuilder {
    private readonly changes: { [uri: string]: lsp.TextEdit[] } = {};
    private readonly documentChanges: Array<
        lsp.CreateFile | lsp.RenameFile | lsp.DeleteFile
    > = [];

    replace(resource: string, range: lsp.Range, newText: string): void {
        this.addEdit(resource, lsp.TextEdit.replace(range, newText));
    }

    insert(resource: string, position: lsp.Position, newText: string): void {
        this.addEdit(resource, lsp.TextEdit.insert(position, newText));
    }

    private addEdit(resource: string, edit: lsp.TextEdit): void {
        const resourceKey = resource.toString();
        let edits = this.changes![resourceKey];
        if (!edits) {
            edits = [];
            this.changes![resourceKey] = edits;
        }

        edits.push(edit);
    }

    getEdit(): lsp.WorkspaceEdit {
        const textualChanges = Object.entries(this.changes).map(
            ([uri, edits]): lsp.TextDocumentEdit => {
                return lsp.TextDocumentEdit.create(
                    { uri, version: null },
                    edits
                );
            }
        );

        return {
            documentChanges: [...textualChanges, ...this.documentChanges],
        };
    }
}
