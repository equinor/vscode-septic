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

export class RenameProvider {
    private cnfgProvider: SepticConfigProvider;
    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    provideRename(
        params: RenameParams,
        doc: ITextDocument
    ): WorkspaceEdit | undefined {
        const cnfg = this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return undefined;
        }
        const offset = doc.offsetAt(params.position);
        const ref = cnfg.getXvrRefFromOffset(offset);
        if (!ref) {
            return undefined;
        }

        const refs = cnfg.getXvrRefs(ref.identifier);

        if (!refs) {
            return undefined;
        }

        const builder = new WorkspaceEditBuilder();
        for (const ref of refs) {
            builder.replace(
                params.textDocument.uri,
                Range.create(
                    doc.positionAt(ref.location.start),
                    doc.positionAt(ref.location.end)
                ),
                params.newName
            );
        }

        return builder.getEdit();
    }

    providePrepareRename(
        params: PrepareRenameParams,
        doc: ITextDocument
    ): Range | null {
        const cnfg = this.cnfgProvider.get(params.textDocument.uri);
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
