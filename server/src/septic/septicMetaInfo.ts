/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "js-yaml";
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
        identifierOptional: false,
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
        return this.metaInfo.calcs;
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

    public updateObjectLevel(objectType: string, level: number): void {
        let obj = this.getObjectsMap().get(objectType);
        if (!obj) {
            return;
        }
        obj.level = level;
    }

    private getCalcMap(): Map<string, SepticCalcInfo> {
        if (!this.calcsMapFlag) {
            for (let calc of this.metaInfo.calcs) {
                this.calcsMap.set(calc.name, calc);
            }
            this.calcsMapFlag = true;
        }
        return this.calcsMap;
    }

    private getObjectsMap(): Map<string, SepticObjectInfo> {
        if (!this.objectsMapFlag) {
            for (let func of this.metaInfo.objects) {
                this.objectsMap.set(func.name, func);
            }
            this.objectsMapFlag = true;
        }
        return this.objectsMap;
    }

    private loadCalcsInfo(): SepticCalcInfoInput[] {
        const filePath = path.join(__dirname, "../../../public/calcs.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const calcInfo: SepticCalcInfoInput[] = YAML.load(
            file
        ) as SepticCalcInfoInput[];
        return calcInfo;
    }

    private loadObjectsInfo(): SepticObjectsInfoInput[] {
        const filePath = path.join(__dirname, "../../../public/objects.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const objectsInfo: SepticObjectsInfoInput[] = YAML.load(
            file
        ) as SepticObjectsInfoInput[];
        return objectsInfo;
    }
    private loadMetaInfo(): SepticMetaInfo {
        let calcInfo = this.loadCalcsInfo();
        let objectsInfo = this.loadObjectsInfo();
        const metaInfo: SepticMetaInfoInput = {
            objects: objectsInfo,
            calcs: calcInfo,
        };
        return this.setDefaultValues(metaInfo);
    }

    private setDefaultValues(
        metaInfoInput: SepticMetaInfoInput
    ): SepticMetaInfo {
        const objects: SepticObjectInfo[] = metaInfoInput.objects.map((obj) => {
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
                    identifierOptional: obj.refs?.identifierOptional
                        ? obj.refs.identifierOptional
                        : false,
                    attrList: obj.refs?.attrList ? obj.refs.attrList : [],
                    attr: obj.refs?.attr ? obj.refs.attr : [],
                },
            };
        });
        const calcs: SepticCalcInfo[] = metaInfoInput.calcs.map((calc) => {
            return {
                name: calc.name,
                documentation: calc.documentation ?? "Calc Documentation",
                signature: calc.signature ?? calc.name + "()",
                retr: calc.retr ?? "Value",
                parameters: calc.parameters ?? [],
            };
        });
        return {
            objects: objects,
            calcs: calcs,
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
    objects: SepticObjectInfo[];
    calcs: SepticCalcInfo[];
}

export interface SepticObjectInfo {
    name: string;
    level: number;
    symbolKind: SymbolKind;
    refs: SepticRefs;
}

export interface SepticCalcInfoInput {
    name: string;
    signature?: string;
    parameters?: SepticCalcParameterInfo[];
    retr?: string;
    documentation?: string;
}

export interface SepticCalcInfo {
    name: string;
    signature: string;
    parameters: SepticCalcParameterInfo[];
    retr: string;
    documentation: string;
}

export interface SepticCalcParameterInfo {
    name: string;
    description: string;
    direction: string;
    type: string;
    arity: string;
}

export interface SepticRefs {
    identifier: boolean;
    identifierOptional: boolean;
    attrList: string[];
    attr: string[];
}

export interface SepticMetaInfoInput {
    objects: SepticObjectsInfoInput[];
    calcs: SepticCalcInfoInput[];
}

export interface SepticRefsInput {
    identifier?: boolean;
    identifierOptional?: boolean;
    attrList?: string[];
    attr?: string[];
}

export interface SepticObjectsInfoInput {
    name: string;
    level?: number;
    symbolKind?: string;
    refs?: SepticRefsInput;
}
