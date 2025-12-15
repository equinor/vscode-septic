/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ScgContext, SepticContext } from "septic";
import { SepticConfigProvider } from "./configProvider";
import { ScgContextManager } from "./scgContextManager";
import { DocumentProvider } from "./documentProvider";

export class ContextManager {
    private cnfgProvider: SepticConfigProvider;
    private scgContextManager: ScgContextManager;
    private documentProvider: DocumentProvider;

    constructor(
        cnfgProvider: SepticConfigProvider,
        scgContextManager: ScgContextManager,
        documentProvider: DocumentProvider,
    ) {
        this.cnfgProvider = cnfgProvider;
        this.scgContextManager = scgContextManager;
        this.documentProvider = documentProvider;
    }

    public async getContext(uri: string): Promise<SepticContext | undefined> {
        const context = await this.scgContextManager.getContext(uri);
        if (context) {
            return context;
        }
        return await this.cnfgProvider.get(uri);
    }

    public async getAllContexts(): Promise<SepticContext[]> {
        const contexts = [];
        for (const uri of this.documentProvider.getAllDocumentUris()) {
            if (uri.endsWith(".yaml")) {
                const context = await this.scgContextManager.getContext(uri);
                if (!context) {
                    continue;
                }
                contexts.push(context);
            } else if (uri.endsWith(".cnfg")) {
                const context = await this.getContext(uri);
                if (!context || context instanceof ScgContext) {
                    continue;
                }
                contexts.push(context);
            }
        }
        return contexts;
    }
}
