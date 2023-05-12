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
import { SepticReferenceProvider } from "../septic";
import { DocumentProvider } from "../documentProvider";

export class RenameProvider {
    private cnfgProvider: SepticConfigProvider;
    private docProvider: DocumentProvider;

    constructor(
        cnfgProvider: SepticConfigProvider,
        docProvider: DocumentProvider
    ) {
        this.cnfgProvider = cnfgProvider;
        this.docProvider = docProvider;
    }

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
            let docRef = await this.docProvider.getDocument(ref.location.uri);
            if (!docRef) {
                continue;
            }
            builder.replace(
                ref.location.uri,
                Range.create(
                    docRef.positionAt(ref.location.start),
                    docRef.positionAt(ref.location.end)
                ),
                params.newName
            );
        }

        return builder.getEdit();
    }

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
