/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-markdown-languageservice]
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CreateFile,
    DeleteFile,
    Position,
    Range,
    RenameFile,
    TextDocumentEdit,
    TextEdit,
    WorkspaceEdit,
} from "vscode-languageserver";

export class WorkspaceEditBuilder {
    private readonly changes: { [uri: string]: TextEdit[] } = {};
    private readonly documentChanges: Array<
        CreateFile | RenameFile | DeleteFile
    > = [];

    replace(resource: string, range: Range, newText: string): void {
        this.addEdit(resource, TextEdit.replace(range, newText));
    }

    insert(resource: string, position: Position, newText: string): void {
        this.addEdit(resource, TextEdit.insert(position, newText));
    }

    private addEdit(resource: string, edit: TextEdit): void {
        const resourceKey = resource.toString();
        let edits = this.changes![resourceKey];
        if (!edits) {
            edits = [];
            this.changes![resourceKey] = edits;
        }

        edits.push(edit);
    }

    getEdit(): WorkspaceEdit {
        const textualChanges = Object.entries(this.changes).map(
            ([uri, edits]): TextDocumentEdit => {
                return TextDocumentEdit.create({ uri, version: null }, edits);
            },
        );

        return {
            documentChanges: [...textualChanges, ...this.documentChanges],
        };
    }
}
