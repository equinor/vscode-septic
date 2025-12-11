/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticCnfg } from "../../cnfg";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CancellationToken } from "../../util/cts";

export function parseSepticForTest(
    text: string,
    cancellationToken?: CancellationToken,
): SepticCnfg {
    const doc = TextDocument.create("test://test.cnfg", "septic", 0, text);
    const cnfg = new SepticCnfg(doc);
    cnfg.parse(cancellationToken);
    return cnfg;
}
