/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticCnfg } from "septic";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CancellationToken } from "vscode-languageserver";

export function parseSepticForTest(
    text: string,
    cancellationToken?: CancellationToken,
): SepticCnfg {
    const doc = TextDocument.create("test://test.cnfg", "septic", 0, text);
    const cnfg = new SepticCnfg(doc);
    cnfg.parse(cancellationToken ?? CancellationToken.None);
    return cnfg;
}
