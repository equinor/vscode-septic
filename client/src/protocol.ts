/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Diagnostic, RequestType } from "vscode-languageclient";

export const fsReadFile = new RequestType<{ uri: string }, number[], any>(
    "septic/fs_readfile"
);

export const findYamlFiles = new RequestType<{}, string[], any>(
    "septic/findYamlFiles"
);

export const globFiles = new RequestType<{ uri: string }, string[], any>(
    "septic/globFiles"
);

export const cylceReport = new RequestType<{ uri: string }, string, any>(
    "septic/cycleReport"
);

export const opcTagList = new RequestType<{ uri: string }, string, any>(
    "septic/opcTagList"
);

export const compareCnfg = new RequestType<
    { prevVersion: string; currentVersion: string; settingsFile: string },
    string,
    any
>("septic/compareCnfg");

export const contexts = new RequestType<{}, string[], any>("septic/contexts");
