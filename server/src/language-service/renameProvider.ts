/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Position,
    PrepareRenameParams,
    Range,
    RenameParams,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "../configProvider";
import { ITextDocument } from "../types/textDocument";
import { WorkspaceEditBuilder } from "../util/editBuilder";
import { SepticCnfg, SepticContext } from "../septic";
import { DocumentProvider } from "../documentProvider";

export type GetDocument = (uri: string) => Promise<ITextDocument | undefined>;

export class RenameProvider {
    private cnfgProvider: SepticConfigProvider;
    private docProvider: DocumentProvider;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: SepticConfigProvider,
        docProvider: DocumentProvider
    ) {
        this.cnfgProvider = cnfgProvider;
        this.docProvider = docProvider;
    }

    /* istanbul ignore next */
    async provideRename(
        params: RenameParams,
        contextProvider: SepticContext
    ): Promise<WorkspaceEdit | undefined> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return undefined;
        }
        return getRenameEdits(
            cnfg,
            params.position,
            params.newName,
            contextProvider,
            this.docProvider.getDocument.bind(this.docProvider)
        );
    }

    /* istanbul ignore next */
    async providePrepareRename(
        params: PrepareRenameParams,
    ): Promise<Range | null> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return null;
        }
        const ref = cnfg.getReferenceFromOffset(cnfg.offsetAt(params.position));
        if (!ref) {
            return null;
        }
        return Range.create(
            cnfg.positionAt(ref.location.start),
            cnfg.positionAt(ref.location.end)
        );
    }
}

export async function getRenameEdits(
    cnfg: SepticCnfg,
    position: Position,
    newName: string,
    contextProvider: SepticContext,
    getDocumentFunction: GetDocument
): Promise<WorkspaceEdit | undefined> {
    const ref = cnfg.getReferenceFromOffset(cnfg.offsetAt(position));
    if (!ref) {
        return undefined;
    }
    const refs = contextProvider.getReferences(ref.identifier);
    if (!refs) {
        return undefined;
    }
    const builder = new WorkspaceEditBuilder();
    for (const ref of refs) {
        const doc = await getDocumentFunction(ref.location.uri);
        if (!doc) {
            continue;
        }
        builder.replace(
            ref.location.uri,
            Range.create(
                doc.positionAt(ref.location.start),
                doc.positionAt(ref.location.end)
            ),
            newName
        );
    }

    return builder.getEdit();
}
