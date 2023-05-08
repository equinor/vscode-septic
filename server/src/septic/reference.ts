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

export interface SepticReferenceProvider {
    load(): Promise<void>;
    getXvrRefs(name: string): SepticReference[] | undefined;
    getAllXvrObjects(): SepticObject[];
}
