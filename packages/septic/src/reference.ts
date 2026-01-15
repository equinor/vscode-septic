/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticObject } from "./elements";

export interface SepticReference {
    identifier: string;
    location: {
        uri: string;
        start: number;
        end: number;
    };
    obj?: SepticObject | undefined;
    type: ReferenceType;
}

export enum ReferenceType {
    xvr,
    calc,
    identifier,
    attribute,
}

export function createSepticReference(
    identifier: string,
    location: {
        uri: string;
        start: number;
        end: number;
    },
    obj: SepticObject | undefined = undefined,
    type: ReferenceType,
): SepticReference {
    return {
        identifier: identifier.replace(/\s/g, ""),
        location: location,
        obj: obj,
        type: type,
    };
}

export type RefValidationFunction = (refs: SepticReference[]) => boolean;

export const defaultRefValidationFunction: RefValidationFunction = (
    refs: SepticReference[],
) => {
    for (const ref of refs) {
        if (ref.obj?.isXvr) {
            return true;
        }
    }
    return false;
};
