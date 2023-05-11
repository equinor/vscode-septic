/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { SepticReference, SepticReferenceProvider } from "./reference";
import { SepticObject } from "./septicElements";
import { SepticConfigProvider } from "../language-service/septicConfigProvider";
import { SepticCnfg } from "./septicCnfg";

export interface ScgConfig {
    outputfile?: string;

    templatepath: string;

    verifycontent: boolean;

    adjustsspacing: boolean;

    sources: ScgSource[];

    layout: ScgTemplate[];
}

export interface ScgSource {
    filename: string;
    id: string;
    sheet: string;
}

export interface ScgTemplate {
    name: string;
    source?: string;
    include?: string[];
}

export class ScgContext implements SepticReferenceProvider {
    public name: string;
    public filePath: string;

    private cnfgProvider: SepticConfigProvider;
    private cnfgCache = new Map<string, SepticCnfg | undefined>();

    public files: string[];
    constructor(
        name: string,
        filePath: string,
        config: ScgConfig,
        filesInTemplateDir: string[],
        cnfgProvider: SepticConfigProvider
    ) {
        this.name = name;
        this.filePath = filePath;
        this.cnfgProvider = cnfgProvider;

        this.files = this.getFiles(config, filesInTemplateDir);
    }

    public fileInContext(file: string): boolean {
        return this.files.includes(file);
    }

    private getFiles(
        scgConfig: ScgConfig,
        filesInTemplateDir: string[]
    ): string[] {
        const files = [];
        for (const template of scgConfig.layout) {
            if (path.extname(template.name) !== ".cnfg") {
                continue;
            }
            let found = false;
            for (const file of filesInTemplateDir) {
                if (template.name === path.basename(file)) {
                    files.push(file);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(
                    `Could not find template: ${template.name} in template dir for context ${this.name}`
                );
            }
        }
        return files;
    }

    public async load(): Promise<void> {
        await Promise.all(
            this.files.map(async (file) => {
                let cnfg = await this.cnfgProvider.get(file);
                if (!cnfg) {
                    return;
                }
                this.cnfgCache.set(cnfg!.uri, cnfg);
            })
        );
    }

    public getXvrRefs(name: string): SepticReference[] | undefined {
        let xvrRefs: SepticReference[] = [];
        for (const file of this.files) {
            let cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                console.log(
                    `Could not get config for ${file} in context ${this.name}`
                );
                continue;
            }
            let localRefs = cnfg.getXvrRefs(name);
            if (localRefs) {
                xvrRefs.push(...localRefs);
            }
        }
        if (!xvrRefs.length) {
            return undefined;
        }
        return xvrRefs;
    }

    public getAllXvrObjects(): SepticObject[] {
        let xvrObjs: SepticObject[] = [];
        for (const file of this.files) {
            let cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            xvrObjs.push(...cnfg.getAllXvrObjects());
        }
        return xvrObjs;
    }
}
