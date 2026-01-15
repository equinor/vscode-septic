/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    DeclarationParams,
    DefinitionParams,
    Position,
    ReferenceParams,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "../configProvider";
import {
    SepticCnfg,
    SepticReference,
    SepticContext,
} from "@equinor/septic-config-lib";

export class ReferenceProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideDefinition(
        params: DefinitionParams,
        contextProvider: SepticContext,
    ): Promise<LocationLinkOffset[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        await contextProvider.load();
        return getDefinition(params.position, cnfg, contextProvider);
    }

    /* istanbul ignore next */
    public async provideReferences(
        params: ReferenceParams,
        contextProvider: SepticContext,
    ): Promise<LocationOffset[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        await contextProvider.load();
        return getReferences(params.position, cnfg, contextProvider);
    }

    /* istanbul ignore next */
    public async provideDeclaration(
        params: DeclarationParams,
        contextProvider: SepticContext,
    ): Promise<LocationLinkOffset[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        await contextProvider.load();
        return getDeclaration(params.position, cnfg, contextProvider);
    }
}

export function getDefinition(
    position: Position,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): LocationLinkOffset[] {
    const ref = cnfg.findReferenceFromLocation(position);
    if (!ref) {
        return [];
    }

    if (ref.obj?.isXvr) {
        return [];
    }

    const xvrRefs = contextProvider.getReferences(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    const definitions = xvrRefs.filter((xvrRef) => {
        return xvrRef.obj?.isXvr;
    });

    return definitions.map((def) => {
        return refToLocationLinkOffset(def);
    });
}

export function getReferences(
    position: Position,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): LocationOffset[] {
    const ref = cnfg.findReferenceFromLocation(position);
    if (!ref) {
        return [];
    }
    const xvrRefs = contextProvider.getReferences(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    return xvrRefs.map((xvr) => {
        return {
            uri: xvr.location.uri,
            range: {
                start: xvr.location.start,
                end: xvr.location.end,
            },
        };
    });
}

export function getDeclaration(
    position: Position,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): LocationLinkOffset[] {
    const ref = cnfg.findReferenceFromLocation(position);
    if (!ref) {
        return [];
    }
    if (ref.obj?.isOpcXvr) {
        return [];
    }
    const xvrRefs = contextProvider.getReferences(ref.identifier);
    if (!xvrRefs) {
        return [];
    }
    const declarations = xvrRefs.filter((xvrRef) => {
        return xvrRef.obj?.isOpcXvr;
    });
    return declarations.map((ref) => {
        return refToLocationLinkOffset(ref);
    });
}

function refToLocationLinkOffset(ref: SepticReference) {
    return {
        targetUri: ref.location.uri,
        targetRange: {
            start: ref.obj!.start,
            end: ref.obj!.end,
        },
        targetSelectionRange: {
            start: ref.obj!.identifier!.start,
            end: ref.obj!.identifier!.end,
        },
    };
}

export interface LocationLinkOffset {
    targetUri: string;
    targetRange: {
        start: number;
        end: number;
    };
    targetSelectionRange: {
        start: number;
        end: number;
    };
}

export interface LocationOffset {
    uri: string;
    range: {
        start: number;
        end: number;
    };
}
