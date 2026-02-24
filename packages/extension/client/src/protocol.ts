/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType, Diagnostic, Position } from "vscode-languageclient";

export interface SepticFunctionExport {
    name: string;
    lines: SepticFunctionLineExport[];
    inputs: SepticFunctionInputExport[];
}

export interface SepticFunctionInputExport {
    name: string;
    type: string;
    pos?: Position;
    uri: string;
}

export interface SepticFunctionLineExport {
    name: string;
    alg: string;
    doc: string;
    pos?: Position;
    uri: string;
}
// Request for root functions in a cnfg file
export const getFunctions = new RequestType<
    { uri: string },
    SepticFunctionExport[],
    unknown
>("septic/getFunctions");

export interface SepticCalcInfo {
    name: string;
    signature: string;
    parameters: SepticCalcParameterInfo[];
    retr: string;
    briefDescription: string;
    detailedDescription: string;
    quality: string;
}

export interface SepticCalcParameterInfo {
    name: string;
    description: string;
    direction: string;
    datatype: string[];
    arity: string;
}

export interface SepticObjectDoc {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    parents: string[];
    publicAttributes: string[];
}

export interface SepticAttributeDocumentation {
    description: string;
    dataType: string;
    enums: string[];
    list: boolean;
    name: string;
    tags: string[];
    calc: boolean;
    postfix: string[];
    noCnfg: boolean;
    default: string[];
    snippet: string;
    noSnippet: boolean;
}

export interface SepticVariable {
    name: string;
    description: string;
    type: string;
}

export const fsReadFile = new RequestType<{ uri: string }, number[], unknown>(
    "septic/fs_readfile",
);

export const findYamlFiles = new RequestType<object, string[], unknown>(
    "septic/findYamlFiles",
);

export const globFiles = new RequestType<{ uri: string }, string[], unknown>(
    "septic/globFiles",
);

export const cylceReport = new RequestType<{ uri: string }, string, unknown>(
    "septic/cycleReport",
);

export const opcTagList = new RequestType<{ uri: string }, string, unknown>(
    "septic/opcTagList",
);

export const getContext = new RequestType<{ uri: string }, string, unknown>(
    "septic/getContext",
);

export const compareCnfg = new RequestType<
    { prevVersion: string; currentVersion: string; settingsFile: string },
    string,
    unknown
>("septic/compareCnfg");

export const contexts = new RequestType<object, string[], unknown>(
    "septic/contexts",
);

export const documentation = new RequestType<
    object,
    { objects: SepticObjectDoc[]; calcs: SepticCalcInfo[] },
    unknown
>("septic/documentation");

export const variables = new RequestType<
    { uri: string },
    SepticVariable[] | undefined,
    unknown
>("septic/variables");

export const validateAlg = new RequestType<
    { calc: string; uri: string },
    Diagnostic[],
    unknown
>("septic/validateCalc");
