/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticObject } from "./elements";
import { SepticObjectHierarchy } from "../metaInfoProvider"; import { SepticReference, RefValidationFunction } from './reference';
import { Position } from 'vscode-languageserver';

export interface SepticContext {
	load(): Promise<void>;
	getReferences(name: string): SepticReference[] | undefined;
	getObjectsByType(...types: string[]): SepticObject[];
	getAllXvrObjects(): SepticObject[];
	getObjectsByIdentifier(identifier: string): SepticObject[];
	getObjectByIdentifierAndType(
		identifier: string,
		type: string
	): SepticObject | undefined;
	findObjectFromLocation(location: Position | number, uri: string): SepticObject | undefined;
	validateReferences(
		name: string,
		validationFunction: RefValidationFunction
	): boolean;
	updateObjectParents(hierarchy: SepticObjectHierarchy): Promise<void>;
}

