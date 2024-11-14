/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    PrepareRenameParams,
    Range,
    RenameParams,
    WorkspaceEdit,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { WorkspaceEditBuilder } from "../util/editBuilder";
import { SepticCnfg, SepticReferenceProvider } from "../septic";
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
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<WorkspaceEdit | undefined> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return undefined;
        }
        const offset = doc.offsetAt(params.position);
        return getRenameEdits(
            cnfg,
            offset,
            params.newName,
            refProvider,
            this.docProvider.getDocument.bind(this.docProvider)
        );
    }

    /* istanbul ignore next */
    async providePrepareRename(
        params: PrepareRenameParams,
        doc: ITextDocument
    ): Promise<Range | null> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return null;
        }
        const ref = cnfg.getXvrRefFromOffset(doc.offsetAt(params.position));
        if (!ref) {
            return null;
        }
        return Range.create(
            doc.positionAt(ref.location.start),
            doc.positionAt(ref.location.end)
        );
    }
}

export async function getRenameEdits(
    cnfg: SepticCnfg,
    offset: number,
    newName: string,
    refProvider: SepticReferenceProvider,
    getDocumentFunction: GetDocument
): Promise<WorkspaceEdit | undefined> {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return undefined;
    }
    const refs = refProvider.getXvrRefs(ref.identifier);
    if (!refs) {
        return undefined;
    }
    const builder = new WorkspaceEditBuilder();
    for (const ref of refs) {
        const docRef = await getDocumentFunction(ref.location.uri);
        if (!docRef) {
            continue;
        }
        builder.replace(
            ref.location.uri,
            Range.create(
                docRef.positionAt(ref.location.start),
                docRef.positionAt(ref.location.end)
            ),
            newName
        );
    }

    return builder.getEdit();
}
