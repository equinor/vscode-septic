/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "yaml";
import * as fs from "fs";
import * as path from "path";
import { SymbolKind } from "vscode-languageserver-types";

export const defaultObjectLevel = 2;
export const defaultObjectSymbolKind = SymbolKind.Object;

const defaultObject: SepticObjectInfo = {
    name: "",
    level: defaultObjectLevel,
    symbolKind: defaultObjectSymbolKind,
    refs: {
        identifier: false,
        attr: [],
        attrList: [],
    },
};

export class SepticMetaInfoProvider {
    private static metaInfoProvider: SepticMetaInfoProvider;
    public metaInfo: SepticMetaInfo;
    private calcsMap: Map<string, SepticCalcInfo> = new Map<
        string,
        SepticCalcInfo
    >();
    private calcsMapFlag = false;
    private objectsMap: Map<string, SepticObjectInfo> = new Map<
        string,
        SepticObjectInfo
    >();
    private objectsMapFlag = false;

    private constructor() {
        this.metaInfo = this.loadMetaInfo();
    }

    public static getInstance(): SepticMetaInfoProvider {
        if (!SepticMetaInfoProvider.metaInfoProvider) {
            SepticMetaInfoProvider.metaInfoProvider =
                new SepticMetaInfoProvider();
        }
        return SepticMetaInfoProvider.metaInfoProvider;
    }

    public getCalcs(): SepticCalcInfo[] {
        return this.metaInfo.septicConfig.calcs;
    }

    public getCalc(name: string): SepticCalcInfo | undefined {
        return this.getCalcMap().get(name);
    }

    public hasCalc(name: string): boolean {
        return this.getCalcMap().has(name);
    }

    public getObject(objectType: string): SepticObjectInfo | undefined {
        return this.getObjectsMap().get(objectType);
    }

    public getObjectDefault(objectType: string): SepticObjectInfo {
        const obj = this.getObjectsMap().get(objectType);
        if (obj) {
            return obj;
        }
        return defaultObject;
    }

    public hasObject(objectType: string): boolean {
        return this.getObjectsMap().has(objectType);
    }

    private getCalcMap(): Map<string, SepticCalcInfo> {
        if (!this.calcsMapFlag) {
            for (let calc of this.metaInfo.septicConfig.calcs) {
                this.calcsMap.set(calc.name, calc);
            }
            this.calcsMapFlag = true;
        }
        return this.calcsMap;
    }

    private getObjectsMap(): Map<string, SepticObjectInfo> {
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
                    : defaultObjectSymbolKind,
                refs: {
                    identifier: obj.refs?.identifier
                        ? obj.refs.identifier
                        : false,
                    attrList: obj.refs?.attrList ? obj.refs.attrList : [],
                    attr: obj.refs?.attr ? obj.refs.attr : [],
                },
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
            return defaultObjectSymbolKind;
    }
}

export interface SepticMetaInfo {
    septicConfig: {
        objects: SepticObjectInfo[];
        calcs: SepticCalcInfo[];
    };
}

export interface SepticObjectInfo {
    name: string;
    level: number;
    symbolKind: SymbolKind;
    refs: SepticRefs;
}

export interface SepticCalcInfo {
    name: string;
}

export interface SepticRefs {
    identifier: boolean;
    attrList: string[];
    attr: string[];
}

export interface SepticMetaInfoInput {
    septicConfig: {
        objects: SepticObjectsInfoInput[];
        calcs: SepticCalcInfo[];
    };
}

export interface SepticRefsInput {
    identifier?: boolean;
    attrList?: string[];
    attr?: string[];
}

export interface SepticObjectsInfoInput {
    name: string;
    level?: number;
    symbolKind?: string;
    refs?: SepticRefsInput;
}
