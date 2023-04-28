/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticObject } from "../parser";

const defaultLevel = 3;
const defaultVariableLevel = 2;

const level1 = ["system", "sopcproc", "dmmyappl", "smpcappl", "displaygroup"];
const level2 = [
    "exprmodl",
    "calcmodl",
    "table",
    "appl",
    "spacer",
    "heading",
    "mvrlist",
    "cvrlist",
    "dvrlist",
    "xvrplot",
    "image",
    "calctable",
    "modelmatrix",
];
const level3 = ["imagestatuslabel", "calcpvr"];

export function getHierarchyLevel(obj: SepticObject): number {
    let type: string = obj.type.toLowerCase();

    if (level1.includes(type)) {
        return 1;
    } else if (level2.includes(type)) {
        return 2;
    } else if (level3.includes(type)) {
        return 3;
    }

    const regexVariable = /[a-zA-Z]+vr/;

    if (regexVariable.test(type)) {
        return defaultVariableLevel;
    }

    return defaultLevel;
}
