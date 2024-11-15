/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    DeclarationParams,
    DefinitionParams,
    ReferenceParams,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    SepticCnfg,
    SepticReference,
    SepticReferenceProvider,
} from "../septic";

export class ReferenceProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideDefinition(
        params: DefinitionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationLinkOffset[]> {
        const offset = doc.offsetAt(params.position);
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        await refProvider.load();
        return getDefinition(offset, cnfg, refProvider);
    }

    /* istanbul ignore next */
    public async provideReferences(
        params: ReferenceParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationOffset[]> {
        const offset = doc.offsetAt(params.position);
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        await refProvider.load();
        return getReferences(offset, cnfg, refProvider);
    }

    /* istanbul ignore next */
    public async provideDeclaration(
        params: DeclarationParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<LocationLinkOffset[]> {
        const offset = doc.offsetAt(params.position);
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        await refProvider.load();
        return getDeclaration(offset, cnfg, refProvider);
    }
}

export function getDefinition(
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider
): LocationLinkOffset[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }

    if (ref.obj?.isXvr) {
        return [];
    }

    const xvrRefs = refProvider.getXvrRefs(ref.identifier);
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
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider
): LocationOffset[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }
    const xvrRefs = refProvider.getXvrRefs(ref.identifier);
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
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider
): LocationLinkOffset[] {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return [];
    }

    if (ref.obj?.isOpcXvr) {
        return [];
    }
    const xvrRefs = refProvider.getXvrRefs(ref.identifier);
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
