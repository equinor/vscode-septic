/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from "vscode-languageserver";

export const fsReadFile = new RequestType<{ uri: string }, number[], unknown>(
    "septic/fs_readfile"
);

export const findYamlFiles = new RequestType<object, string[], unknown>(
    "septic/findYamlFiles"
);

export const globFiles = new RequestType<{ uri: string }, string[], unknown>(
    "septic/globFiles"
);

export const cylceReport = new RequestType<{ uri: string }, string, unknown>(
    "septic/cycleReport"
);

export const opcTagList = new RequestType<{ uri: string }, string, unknown>(
    "septic/opcTagList"
);

export const compareCnfg = new RequestType<
    { prevVersion: string; currentVersion: string; settingsFile: string },
    string,
    unknown
>("septic/compareCnfg");

export const contexts = new RequestType<object, string[], unknown>("septic/contexts");
