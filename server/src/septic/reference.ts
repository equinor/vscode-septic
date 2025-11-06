/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Cycle } from "./cycle";
import { SepticObject } from "./elements";
import { SepticObjectHierarchy } from "../metaInfoProvider";

export interface SepticReference {
    identifier: string;
    location: {
        uri: string;
        start: number;
        end: number;
    };
    obj?: SepticObject;
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
    type: ReferenceType
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
    refs: SepticReference[]
) => {
    for (const ref of refs) {
        if (ref.obj?.isXvr) {
            return true;
        }
    }
    return false;
};

export interface SepticReferenceProvider {
    load(): Promise<void>;
    getXvrRefs(name: string): SepticReference[] | undefined;
    getObjectsByType(...types: string[]): SepticObject[];
    getAllXvrObjects(): SepticObject[];
    getObjectsByIdentifier(identifier: string): SepticObject[];
    getObjectByIdentifierAndType(
        identifier: string,
        type: string
    ): SepticObject | undefined;
    getObjectFromOffset(offset: number, uri: string): SepticObject | undefined;
    validateRef(
        name: string,
        validationFunction: RefValidationFunction
    ): boolean;
    updateObjectParents(hierarchy: SepticObjectHierarchy): Promise<void>;
    findAlgCycles(): Cycle[];
}
