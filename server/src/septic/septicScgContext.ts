/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import {
    RefValidationFunction,
    SepticReference,
    SepticReferenceProvider,
    defaultRefValidationFunction,
} from "./reference";
import { SepticObject } from "./septicElements";
import { SepticConfigProvider } from "../language-service/septicConfigProvider";
import { SepticCnfg } from "./septicCnfg";
import { SepticObjectHierarchy } from "./septicMetaInfo";
import { updateParentObjects } from "./hierarchy";
import { Alg, Cycle, findAlgCycles } from "./cycle";

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
    public cycles: Cycle[] = [];

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
                this.cnfgCache.set(cnfg.uri, cnfg);
            })
        );
    }

    public getObjectsByIdentifier(identifier: string): SepticObject[] {
        let objects: SepticObject[] = [];
        for (let file of this.files) {
            let cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            objects.push(...cnfg.getObjectsByIdentifier(identifier));
        }
        return objects;
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

    public validateRef(
        name: string,
        validationFunction: RefValidationFunction = defaultRefValidationFunction
    ): boolean {
        let xvrRefs = this.getXvrRefs(name);
        if (!xvrRefs) {
            return false;
        }
        return validationFunction(xvrRefs);
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

    public async updateObjectParents(
        hierarchy: SepticObjectHierarchy
    ): Promise<void> {
        await this.load();
        const objects: SepticObject[] = [];
        for (let file of this.files) {
            let cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            objects.push(...cnfg.objects);
        }
        updateParentObjects(objects, hierarchy);
    }

    public getCalcPvrs(): SepticObject[] {
        let calcPvrs: SepticObject[] = [];
        for (const file of this.files) {
            let cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            calcPvrs.push(...cnfg.getCalcPvrs());
        }
        return calcPvrs;
    }

    public getCycles(): Cycle[] {
        return this.cycles;
    }

    public detectCycles(): void {
        let calcPvrs = this.getCalcPvrs();
        let algs: Alg[] = [];
        for (let calcPvr of calcPvrs) {
            let alg = calcPvr.getAttribute("Alg");
            let content = alg?.getAttrValue()?.getValue();
            if (!content || !calcPvr.identifier?.name) {
                continue;
            }
            algs.push({
                calcPvrName: calcPvr.identifier?.name!,
                content: content,
            });
        }
        this.cycles = findAlgCycles(algs);
    }
}
