/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import {
    RefValidationFunction,
    SepticReference,
    defaultRefValidationFunction,
} from "./reference";
import { SepticContext } from "./context";
import { SepticObject } from "./elements";
import { ISepticConfigProvider } from "./configProvider";
import { SepticCnfg } from "./cnfg";
import { updateParentObjects } from "./hierarchy";
import { readFileSync } from "fs";
import * as yaml from "js-yaml";

import Ajv from "ajv";
import { getBasePublicPath } from "./path";

const ajv = new Ajv();
const scgSchemaPath = getBasePublicPath() + "/scg_config.schema.json";
const scgSchema = JSON.parse(readFileSync(scgSchemaPath, "utf-8"));
export const validate_scg = ajv.compile<ScgConfigSchema>(scgSchema);

export interface ScgConfigSchema {
    outputfile?: string;
    templatepath: string;
    adjustspacing?: boolean;
    verifycontent?: boolean;
    counters?: {
        name: string;
        value: number;
    }[];
    sources: {
        filename: string;
        id: string;
        sheet?: string;
        delimiter?: string;
    }[];
    layout: {
        name: string;
        source?: string;
        include?: object;
    }[];
}

export function scgConfigFromYAML(yamlContent: string): ScgConfigSchema {
    const config = yaml.load(yamlContent);
    const valid = validate_scg(config);
    if (!valid) {
        throw new Error(
            `Invalid SCG config: ${ajv.errorsText(validate_scg.errors)}`,
        );
    }
    return config;
}

export class ScgContext implements SepticContext {
    public name: string;
    public filePath: string;

    private cnfgProvider: ISepticConfigProvider;
    private cnfgCache = new Map<string, SepticCnfg | undefined>();

    public files: string[];
    constructor(
        name: string,
        filePath: string,
        config: ScgConfigSchema,
        cnfgProvider: ISepticConfigProvider,
    ) {
        this.name = name;
        this.filePath = filePath;
        this.cnfgProvider = cnfgProvider;

        this.files = this.getFiles(config);
    }

    public fileInContext(file: string): boolean {
        return this.files.includes(file);
    }

    private getFiles(scgConfig: ScgConfigSchema): string[] {
        return scgConfig.layout.map((layout) => {
            if (this.filePath.startsWith("file:")) {
                return this.resolveUrlPath(scgConfig.templatepath, layout.name);
            }
            return this.resolveFilePath(scgConfig.templatepath, layout.name);
        });
    }

    private resolveUrlPath(templatePath: string, layoutName: string): string {
        const baseUrl = new URL(this.filePath);
        const dirUrl = new URL(".", baseUrl);
        const relativePath = path.posix.join(templatePath, layoutName);
        const resolvedUrl = new URL(relativePath, dirUrl);
        return resolvedUrl.href;
    }

    private resolveFilePath(templatePath: string, layoutName: string): string {
        const absoluteBasePath = path.isAbsolute(this.filePath)
            ? this.filePath
            : path.resolve(this.filePath);
        return path.join(
            path.dirname(absoluteBasePath),
            templatePath,
            layoutName,
        );
    }

    public async load(): Promise<void> {
        await Promise.all(
            this.files.map(async (file) => {
                const cnfg = await this.cnfgProvider.get(file);
                if (!cnfg) {
                    return;
                }
                this.cnfgCache.set(cnfg!.uri, cnfg);
            }),
        );
    }

    public getObjectsByIdentifier(identifier: string): SepticObject[] {
        const objects: SepticObject[] = [];
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            objects.push(...cnfg.getObjectsByIdentifier(identifier));
        }
        return objects;
    }
    public getObjectByIdentifierAndType(
        identifier: string,
        type: string,
    ): SepticObject | undefined {
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            const obj = cnfg.getObjectByIdentifierAndType(identifier, type);
            if (obj) {
                return obj;
            }
        }
        return undefined;
    }

    public getReferences(name: string): SepticReference[] | undefined {
        const references: SepticReference[] = [];
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            const localReferences = cnfg.getReferences(name);
            if (localReferences) {
                references.push(...localReferences);
            }
        }
        if (!references.length) {
            return undefined;
        }
        return references;
    }

    public validateReferences(
        name: string,
        validationFunction: RefValidationFunction = defaultRefValidationFunction,
    ): boolean {
        const references = this.getReferences(name);
        if (!references) {
            return false;
        }
        return validationFunction(references);
    }

    public getAllXvrObjects(): SepticObject[] {
        const xvrObjs: SepticObject[] = [];
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            xvrObjs.push(...cnfg.getAllXvrObjects());
        }
        return xvrObjs;
    }

    public getObjectsByType(...types: string[]): SepticObject[] {
        const objects: SepticObject[] = [];
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            objects.push(...cnfg.getObjectsByType(...types));
        }
        return objects;
    }

    public findObjectFromLocation(
        offset: number,
        uri: string = "",
    ): SepticObject | undefined {
        const cnfg = this.cnfgCache.get(uri);
        if (!cnfg) {
            return undefined;
        }
        const obj = cnfg.findObjectFromLocation(offset);
        if (obj) {
            return obj;
        }
        let ind = this.files.indexOf(uri);
        while (ind >= 1) {
            ind--;
            // @ts-expect-error: Ind will always be valid
            const cnfg = this.cnfgCache.get(this.files[ind]);
            if (!cnfg) {
                continue;
            }
            if (cnfg.objects.length) {
                return cnfg.objects[cnfg.objects.length - 1];
            }
        }
        return undefined;
    }

    public async updateObjectParents(): Promise<void> {
        await this.load();
        const objects: SepticObject[] = [];
        for (const file of this.files) {
            const cnfg = this.cnfgCache.get(file);
            if (!cnfg) {
                continue;
            }
            objects.push(...cnfg.objects);
        }
        updateParentObjects(objects);
    }
}
