/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticObject } from "./septicElements";

export interface SepticReference {
    identifier: string;
    location: {
        uri: string;
        start: number;
        end: number;
    };
    obj?: SepticObject;
}

export type RefValidationFunction = (refs: SepticReference[]) => boolean;

export const defaultRefValidationFunction: RefValidationFunction = (
    refs: SepticReference[]
) => {
    for (const ref of refs) {
        if (ref.obj && /^[METCD]vr$/.test(ref.obj.type)) {
            return true;
        }
    }
    return false;
};

export interface SepticReferenceProvider {
    load(): Promise<void>;
    getXvrRefs(name: string): SepticReference[] | undefined;
    getAllXvrObjects(): SepticObject[];
    validateRef(
        name: string,
        validationFunction: RefValidationFunction
    ): boolean;
}
