/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { SymbolKind } from "vscode-languageserver-types";
import { bold, code, h3, h4, horizontalRule } from "../util/markdown";

export const defaultObjectLevel = 2;
export const defaultObjectSymbolKind = SymbolKind.Object;

const defaultObject: SepticObjectInfo = {
    name: "",
    level: defaultObjectLevel,
    symbolKind: defaultObjectSymbolKind,
    refs: {
        identifier: false,
        identifierOptional: false,
        attrList: [],
    },
};

export class SepticMetaInfoProvider {
    private static metaInfoProvider: SepticMetaInfoProvider;
    private calcsMap: Map<string, SepticCalcInfo>;
    private objectsMap: Map<string, SepticObjectInfo>;
    private objectsDocMap: Map<string, ISepticObjectDocumentation>;

    private constructor() {
        this.calcsMap = this.loadCalcsInfo();
        this.objectsMap = this.loadObjectsInfo();
        this.objectsDocMap = this.loadObjectsDocumentation();
    }

    public static getInstance(): SepticMetaInfoProvider {
        if (!SepticMetaInfoProvider.metaInfoProvider) {
            SepticMetaInfoProvider.metaInfoProvider =
                new SepticMetaInfoProvider();
        }
        return SepticMetaInfoProvider.metaInfoProvider;
    }

    public getCalcs(): SepticCalcInfo[] {
        return [...this.calcsMap.values()];
    }

    public getCalc(name: string): SepticCalcInfo | undefined {
        return this.calcsMap.get(name);
    }

    public hasCalc(name: string): boolean {
        return this.calcsMap.has(name);
    }

    public getObject(objectType: string): SepticObjectInfo | undefined {
        return this.objectsMap.get(objectType);
    }

    public getObjectDefault(objectType: string): SepticObjectInfo {
        const obj = this.objectsMap.get(objectType);
        if (obj) {
            return obj;
        }
        return defaultObject;
    }

    public hasObject(objectType: string): boolean {
        return this.objectsMap.has(objectType);
    }

    public updateObjectLevel(objectType: string, level: number): void {
        let obj = this.objectsMap.get(objectType);
        if (!obj) {
            return;
        }
        obj.level = level;
    }

    public getObjectDocumentation(
        objectType: string
    ): ISepticObjectDocumentation | undefined {
        return this.objectsDocMap.get(objectType);
    }

    private loadCalcsInfo(): Map<string, SepticCalcInfo> {
        const filePath = path.join(__dirname, "../../../public/calcs.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const calcInfo: SepticCalcInfoInput[] = YAML.load(
            file
        ) as SepticCalcInfoInput[];
        const calcs: SepticCalcInfo[] = calcInfo.map((calc) => {
            return {
                name: calc.name,
                briefDescription: calc.briefDescription ?? "Brief description",
                detailedDescription:
                    calc.detailedDescription ?? "Detailed description",
                signature: calc.signature ?? calc.name + "()",
                retr: calc.retr ?? "",
                parameters: calc.parameters ?? [],
            };
        });
        let calcsMap = new Map<string, SepticCalcInfo>();
        for (let calc of calcs) {
            calcsMap.set(calc.name, calc);
        }
        return calcsMap;
    }

    private loadObjectsInfo(): Map<string, SepticObjectInfo> {
        const filePath = path.join(__dirname, "../../../public/objects.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const objectsInfo: SepticObjectsInfoInput[] = YAML.load(
            file
        ) as SepticObjectsInfoInput[];
        const objects: SepticObjectInfo[] = objectsInfo.map((obj) => {
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
                },
            };
        });
        let objectsMap = new Map<string, SepticObjectInfo>();
        for (let obj of objects) {
            objectsMap.set(obj.name, obj);
        }
        return objectsMap;
    }

    private loadObjectsDocumentation(): Map<
        string,
        ISepticObjectDocumentation
    > {
        const filePath = path.join(
            __dirname,
            "../../../public/objectsDoc.yaml"
        );
        const file = fs.readFileSync(filePath, "utf-8");
        const objectsDoc: SepticObjectDocumentationInput[] = YAML.load(
            file
        ) as SepticObjectDocumentationInput[];
        let objectsDocMap = new Map<string, ISepticObjectDocumentation>();
        for (let obj of objectsDoc) {
            objectsDocMap.set(obj.name, new SepticObjectDocumentation(obj));
        }
        return objectsDocMap;
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

class SepticObjectDocumentation implements ISepticObjectDocumentation {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    attrMap: Map<string, SepticAttributeDocumentation> = new Map<
        string,
        SepticAttributeDocumentation
    >();

    constructor(input: SepticObjectDocumentationInput) {
        this.name = input.name;
        this.attributes = input.attributes;
        this.description = input.description;
        this.attributes.forEach((attr) => this.attrMap.set(attr.name, attr));
    }

    public getAttribute(
        attr: string
    ): SepticAttributeDocumentation | undefined {
        return this.attrMap.get(attr);
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

export interface SepticObjectsInfoInput {
    name: string;
    level?: number;
    symbolKind?: string;
    refs?: SepticRefsInput;
}

export interface ISepticObjectDocumentation {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    getAttribute(attr: string): SepticAttributeDocumentation | undefined;
}

export interface SepticObjectDocumentationInput {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
}

export interface SepticAttributeDocumentation {
    briefDescription: string;
    dataType: string;
    default: string;
    detailedDescription: string;
    enums: string[];
    list: boolean;
    name: string;
    tags: string[];
}

export interface SepticCalcInfoInput {
    name: string;
    signature?: string;
    parameters?: SepticCalcParameterInfo[];
    retr?: string;
    briefDescription?: string;
    detailedDescription?: string;
}

export interface SepticCalcInfo {
    name: string;
    signature: string;
    parameters: SepticCalcParameterInfo[];
    retr: string;
    briefDescription: string;
    detailedDescription: string;
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
}

export interface SepticMetaInfoInput {
    objects: SepticObjectsInfoInput[];
    calcs: SepticCalcInfoInput[];
}

export interface SepticRefsInput {
    identifier?: boolean;
    identifierOptional?: boolean;
    attrList?: string[];
}

export function formatObjectDocumentationMarkdown(
    objDoc: SepticObjectDocumentationInput
) {
    let markdown: string[] = [];
    markdown.push(h4(objDoc.name));
    markdown.push(horizontalRule());
    markdown.push(`${objDoc.description}`);
    markdown.push("Attributes:");
    objDoc.attributes.forEach((attr) => {
        markdown.push(formatObjectAttribute(attr));
    });
    return markdown.join("\n\n");
}

export function formatObjectAttribute(
    attrDoc: SepticAttributeDocumentation,
    long = false
) {
    if (!long) {
        return "`" + attrDoc.name + "`" + `: ${attrDoc.briefDescription}`;
    }
    let doc = h4(attrDoc.name);
    let newline = "\n\n";
    doc += newline + horizontalRule();
    doc += newline + attrDoc.briefDescription;
    doc += newline + code("DataType:") + " " + attrDoc.dataType;
    if (attrDoc.dataType === "Enum") {
        doc += newline + code("Enums:") + " " + `${attrDoc.enums.join("|")}`;
    }
    if (attrDoc.list) {
        doc += newline + code("List:") + " True";
    }
    if (attrDoc.default !== "") {
        doc += newline + code("Default:") + " " + attrDoc.default;
    }
    if (attrDoc.tags.length) {
        doc += newline + code("Tags:");
        doc += attrDoc.tags
            .map((tag) => {
                return tag;
            })
            .join(",");
    }
    if (attrDoc.detailedDescription !== "") {
        doc += newline + attrDoc.detailedDescription;
    }
    return doc;
}

export function formatCalcMarkdown(
    calc: SepticCalcInfo,
    short: boolean = false
) {
    let formattedParameters = calc.parameters.map((param) => {
        return formatCalcParameter(param);
    });
    let markdown = [
        "```js\n" + `function ${calc.signature}` + "\n```",
        horizontalRule(),
        `${calc.briefDescription.replace(/\r\n/g, "\n")}`,
    ];

    if (formattedParameters.length) {
        markdown.push(
            "\n```\n" + formattedParameters[0],
            ...formattedParameters.slice(1),
            `@return - ${calc.retr}` + "\n```\n"
        );
    }

    if (!short) {
        markdown.push(calc.detailedDescription.replace(/\r\n/g, "\n"));
    }

    return markdown.join("\n\n");
}

export function formatCalcParameter(param: SepticCalcParameterInfo) {
    let formattedParam = `@param[${param.direction}]: ${param.name} - ${param.description}`;
    if (param.type.length) {
        formattedParam += ` - ${param.type}`;
    }
    if (param.arity.length) {
        formattedParam += ` - ${param.arity}`;
    }
    return formattedParam;
}

export interface ICalcNumParameter {
    minNumber: number;
    maxNumber: number;
    maxActive: boolean;
    parityActive: boolean;
}

export function calcNumParameterInfo(
    calcInfo: SepticCalcInfo
): ICalcNumParameter {
    let minNumber = 0;
    let maxNumber = 0;
    let maxActive = true;
    let parityActive = true;
    for (let i = 0; i < calcInfo.parameters.length; i++) {
        let param = calcInfo.parameters[i];
        switch (param.arity) {
            case "even":
                maxActive = false;
                minNumber += 2;
                break;
            case "odd":
                maxActive = false;
                minNumber += 1;
                break;
            case "+":
                maxActive = false;
                parityActive = false;
                minNumber += 1;
                break;
            case "optional":
                let restIsOptional = true;
                for (let j = i + 1; j < calcInfo.parameters.length; j++) {
                    if (calcInfo.parameters[j].arity !== "optional") {
                        restIsOptional = false;
                        break;
                    }
                }
                if (!restIsOptional) {
                    minNumber += 1;
                } else {
                    parityActive = false;
                }
                maxNumber += 1;
                break;
            default:
                let n = parseInt(param.arity);
                minNumber += n;
                maxNumber += n;
                break;
        }
    }
    return {
        minNumber: minNumber,
        maxNumber: maxNumber,
        maxActive: maxActive,
        parityActive: parityActive,
    };
}

export function arityToNum(arity: string): number {
    switch (arity) {
        case "even":
        case "odd":
        case "+":
            return Infinity;
        case "optional":
            return 1;
        default:
            return parseInt(arity);
    }
}
