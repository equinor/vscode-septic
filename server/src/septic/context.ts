/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticObject } from "./elements";
import { SepticReference, RefValidationFunction } from "./reference";
import { Position } from "vscode-languageserver";

export interface SepticContext {
    load(): Promise<void>;
    getReferences(name: string): SepticReference[] | undefined;
    getAllXvrObjects(): SepticObject[];
    getObjectsByIdentifier(identifier: string): SepticObject[];
    getObjectsByType(...types: string[]): SepticObject[];
    getObjectByIdentifierAndType(
        identifier: string,
        type: string
    ): SepticObject | undefined;
    findObjectFromLocation(
        location: Position | number,
        uri: string
    ): SepticObject | undefined;
    validateReferences(
        name: string,
        validationFunction: RefValidationFunction
    ): boolean;
    updateObjectParents(): Promise<void>;
}
