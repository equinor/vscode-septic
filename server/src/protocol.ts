/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from "vscode-languageserver";

export const findCnfgFilesInWorkspace = new RequestType<{}, string[], any>(
    "septic/findCnfgFilesInWorkspace"
);

export const fsReadFile = new RequestType<{ uri: string }, number[], any>(
    "septic/fs_readfile"
);

export const findYamlFiles = new RequestType<{}, string[], any>(
    "septic/findYamlFiles"
);

export const globFiles = new RequestType<{ uri: string }, string[], any>(
    "septic/globFiles"
);
