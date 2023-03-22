/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    DeclarationParams,
    DefinitionParams,
    Location,
    LocationLink,
    ReferenceParams,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject } from "../septic";

export class ReferenceProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    public provideDefinition(
        params: DefinitionParams,
        doc: ITextDocument
    ): LocationLink[] {
        const offset = doc.offsetAt(params.position);
        const cnfg = this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        return getDefinition(offset, cnfg, doc);
    }

    public provideReferences(
        params: ReferenceParams,
        doc: ITextDocument
    ): Location[] {
        const offset = doc.offsetAt(params.position);
        const cnfg = this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        return getReferences(offset, cnfg, doc);
    }

    public provideDeclaration(params: DeclarationParams, doc: ITextDocument) {
        const offset = doc.offsetAt(params.position);
        const cnfg = this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        return getDeclaration(offset, cnfg, doc);
    }
}

export function getDefinition(
    offset: number,
    cnfg: SepticCnfg,
    doc: ITextDocument
): LocationLink[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }

    if (ref.obj && /^[TMECD]vr/.test(ref.obj.type)) {
        return [];
    }

    const xvrRefs = cnfg.getXvrRefs(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    let definitions = xvrRefs.filter((xvrRef) => {
        return xvrRef.obj && /^[TMECD]vr/.test(xvrRef.obj.type);
    });

    return definitions.map((dec) => {
        return objToLocationLink(dec.obj!, doc);
    });
}

export function getReferences(
    offset: number,
    cnfg: SepticCnfg,
    doc: ITextDocument
): Location[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }
    const xvrRefs = cnfg.getXvrRefs(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    return xvrRefs.map((xvr) => {
        return {
            uri: doc.uri,
            range: {
                start: doc.positionAt(xvr.location.start),
                end: doc.positionAt(xvr.location.end),
            },
        };
    });
}

export function getDeclaration(
    offset: number,
    cnfg: SepticCnfg,
    doc: ITextDocument
): LocationLink[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }

    if (ref.obj && /^Sopc[TMECD]vr/.test(ref.obj.type)) {
        return [];
    }
    const xvrRefs = cnfg.getXvrRefs(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    let declarations = xvrRefs.filter((xvrRef) => {
        return xvrRef.obj && /^Sopc[TMECD]vr/.test(xvrRef.obj.type);
    });
    return declarations.map((dec) => {
        return objToLocationLink(dec.obj!, doc);
    });
}

function objToLocationLink(obj: SepticObject, doc: ITextDocument) {
    return {
        targetUri: doc.uri,
        targetRange: {
            start: doc.positionAt(obj.start),
            end: doc.positionAt(obj.end),
        },
        targetSelectionRange: {
            start: doc.positionAt(obj.identifier!.start),
            end: doc.positionAt(obj.identifier!.end),
        },
    };
}
