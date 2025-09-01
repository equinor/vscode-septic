/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType, Diagnostic } from "vscode-languageserver";
import { SepticCalcInfo, SepticObjectDoc } from './septic';
import { SepticFunction, SepticFunctionLine } from './septic/septicFunction';
// Types for root function info
export type { SepticFunction, SepticFunctionLine };
// Request for root functions in a cnfg file
export const getFunctions = new RequestType<{ uri: string }, SepticFunction[], unknown>(
    "septic/getFunctions"
);

export interface SepticVariable {
    name: string;
    description: string;
    type: string;
}


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

export const getContext = new RequestType<{ uri: string }, string, unknown>(
    "septic/getContext"
);

export const compareCnfg = new RequestType<
    { prevVersion: string; currentVersion: string; settingsFile: string },
    string,
    unknown
>("septic/compareCnfg");

export const contexts = new RequestType<object, string[], unknown>("septic/contexts");

export const documentation = new RequestType<object, { objects: SepticObjectDoc[], calcs: SepticCalcInfo[] }, unknown>("septic/documentation");

export const variables = new RequestType<{ uri: string }, SepticVariable[] | undefined, unknown>("septic/variables");

export const validateAlg = new RequestType<{ calc: string, uri: string }, Diagnostic[], unknown>("septic/validateCalc");
