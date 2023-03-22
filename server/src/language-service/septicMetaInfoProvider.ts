/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "yaml";
import * as fs from "fs";
import * as path from "path";
import { SymbolKind } from "vscode-languageserver-types";

export const defaultObjectLevel = 2;
export const defualtObjectSymbolKind = SymbolKind.Object;

const defaultObject = {
    level: defaultObjectLevel,
    symbolKind: defualtObjectSymbolKind,
};

export class SepticMetaInfoProvider {
    public metaInfo: SepticMetaInfo;
    private calcsMap: Map<string, SepticCalcsInfo> = new Map<
        string,
        SepticCalcsInfo
    >();
    private calcsMapFlag = false;
    private objectsMap: Map<string, SepticObjectsInfo> = new Map<
        string,
        SepticObjectsInfo
    >();
    private objectsMapFlag = false;

    constructor() {
        this.metaInfo = this.loadMetaInfo();
    }
    public getCalcs() {
        return this.metaInfo.septicConfig.calcs;
    }

    public getCalc(name: string) {
        return this.getCalcMap().get(name);
    }

    public hasCalc(name: string) {
        return this.getCalcMap().has(name);
    }

    public getObject(objectType: string) {
        return this.getObjectsMap().get(objectType);
    }

    public getObjectDefault(objectType: string) {
        const obj = this.getObjectsMap().get(objectType);
        if (obj) {
            return obj;
        }
        return defaultObject;
    }

    public hasObject(objectType: string) {
        return this.getObjectsMap().has(objectType);
    }

    public getCalcMap() {
        if (!this.calcsMapFlag) {
            for (let calc of this.metaInfo.septicConfig.calcs) {
                this.calcsMap.set(calc.name, calc);
            }
            this.calcsMapFlag = true;
        }
        return this.calcsMap;
    }

    public getObjects() {
        return this.metaInfo.septicConfig.objects;
    }

    public getObjectsMap() {
        if (!this.objectsMapFlag) {
            for (let func of this.metaInfo.septicConfig.objects) {
                this.objectsMap.set(func.name, func);
            }
            this.objectsMapFlag = true;
        }
        return this.objectsMap;
    }

    private loadMetaInfo(): SepticMetaInfo {
        const filePath = path.join(__dirname, "../public/septicMetaInfo.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const metaInfo: SepticMetaInfoInput = YAML.parse(file);
        return this.setDefaultValues(metaInfo);
    }

    private setDefaultValues(
        metaInfoInput: SepticMetaInfoInput
    ): SepticMetaInfo {
        const objects = metaInfoInput.septicConfig.objects.map((obj) => {
            return {
                name: obj.name,
                level: obj.level ? obj.level : defaultObjectLevel,
                symbolKind: obj.symbolKind
                    ? toSymbolKind(obj.symbolKind)
                    : defualtObjectSymbolKind,
            };
        });
        return {
            septicConfig: {
                objects: objects,
                calcs: metaInfoInput.septicConfig.calcs,
            },
        };
    }
}

function toSymbolKind(name: string) {
    const nameLower = name.toLowerCase();
    switch (nameLower) {
        case "function":
            return SymbolKind.Function;
        case "namespace":
            return SymbolKind.Namespace;
        case "variable":
            return SymbolKind.Variable;
        case "array":
            return SymbolKind.Array;
        case "interface":
            return SymbolKind.Interface;
        default:
            return defualtObjectSymbolKind;
    }
}

export interface SepticMetaInfo {
    septicConfig: {
        objects: SepticObjectsInfo[];
        calcs: SepticCalcsInfo[];
    };
}

export interface SepticObjectsInfo {
    name: string;
    level: number;
    symbolKind: SymbolKind;
}

export interface SepticCalcsInfo {
    name: string;
}

export interface SepticMetaInfoInput {
    septicConfig: {
        objects: SepticObjectsInfoInput[];
        calcs: SepticCalcsInfo[];
    };
}

export interface SepticObjectsInfoInput {
    name: string;
    level?: number;
    symbolKind?: string;
}
