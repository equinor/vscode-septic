/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextEdit, DocumentFormattingParams } from "vscode-languageserver";
import { ISepticConfigProvider } from "../configProvider";
import { SepticCnfgFormatter } from "@equinor/septic-config-lib";

export class FormattingProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideFormatting(
        params: DocumentFormattingParams,
    ): Promise<TextEdit[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        const formatter = new SepticCnfgFormatter(cnfg);
        return formatter.format();
    }
}
