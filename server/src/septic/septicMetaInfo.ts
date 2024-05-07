/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { SymbolKind } from "vscode-languageserver-types";
import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
    InsertTextMode,
} from "vscode-languageserver";

export const defaultObjectLevel = 2;
export const defaultObjectSymbolKind = SymbolKind.Object;

const defaultObject: SepticObjectInfo = {
    name: "",
    level: defaultObjectLevel,
    symbolKind: defaultObjectSymbolKind,
    refs: {
        identifier: false,
        identifierOptional: false,
        attributes: [],
    },
};

export class SepticMetaInfoProvider {
    private static metaInfoProvider: SepticMetaInfoProvider;
    private static version: string = "latest";
    private calcsMap: Map<string, SepticCalcInfo>;
    private objectsMap: Map<string, SepticObjectInfo>;
    private objectsDocMap: Map<string, ISepticObjectDocumentation>;
    private objectHierarchy: SepticObjectHierarchy;
    private snippets: CompletionItem[];
    private version: string;

    private constructor(version: string) {
        this.version = version;
        this.calcsMap = this.loadCalcsInfo(version);
        this.objectsMap = this.loadObjectsInfo();
        this.objectsDocMap = this.loadObjectsDocumentation(version);
        this.objectHierarchy = this.loadObjectHierarchy(
            Array.from(this.objectsDocMap.values())
        );
        this.snippets = this.loadSnippets(version);
    }

    public static getInstance(): SepticMetaInfoProvider {
        if (!SepticMetaInfoProvider.metaInfoProvider) {
            SepticMetaInfoProvider.metaInfoProvider =
                new SepticMetaInfoProvider(SepticMetaInfoProvider.version);
        }
        if (
            SepticMetaInfoProvider.metaInfoProvider.version !==
            SepticMetaInfoProvider.version
        ) {
            SepticMetaInfoProvider.metaInfoProvider =
                new SepticMetaInfoProvider(SepticMetaInfoProvider.version);
        }
        return SepticMetaInfoProvider.metaInfoProvider;
    }

    public static setVersion(version: string): void {
        SepticMetaInfoProvider.version = version;
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

    public getObjectHierarchy(): SepticObjectHierarchy {
        return this.objectHierarchy;
    }

    public getSnippets(): CompletionItem[] {
        return this.snippets;
    }

    private loadCalcsInfo(version: string): Map<string, SepticCalcInfo> {
        const filePath = path.join(
            __dirname,
            `../../../public/${version.replace(/\./g, "_")}/calcs.yaml`
        );
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
                parameters: updateDatatypeParams(calc.parameters),
                quality: calc.quality?.replace(/\r?\n/g, "") ?? "",
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
                    attributes: obj.refs?.attributes ? obj.refs.attributes : [],
                },
            };
        });
        let objectsMap = new Map<string, SepticObjectInfo>();
        for (let obj of objects) {
            objectsMap.set(obj.name, obj);
        }
        return objectsMap;
    }

    private loadObjectsDocumentation(
        version: string
    ): Map<string, ISepticObjectDocumentation> {
        const filePath = path.join(
            __dirname,
            `../../../public/${version.replace(/\./g, "_")}/objectsDoc.yaml`
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

    private loadSnippets(version: string): CompletionItem[] {
        const filePath = path.join(
            __dirname,
            `../../../public/${version.replace(/\./g, "_")}/snippets.yaml`
        );
        const file = fs.readFileSync(filePath, "utf-8");
        const objectSnippets: SepticObjectSnippet[] = YAML.load(
            file
        ) as SepticObjectSnippet[];
        let snippets: CompletionItem[] = objectSnippets.map((obj) => {
            let compItem: CompletionItem = {
                label: obj.prefix,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: obj.body.join("\n"),
                insertTextMode: InsertTextMode.asIs,
                detail: obj.description,
            };
            return compItem;
        });
        return snippets;
    }

    private loadObjectHierarchy(
        objectsDoc: ISepticObjectDocumentation[]
    ): SepticObjectHierarchy {
        let objectTree = createSepticObjectTree(objectsDoc);
        updateObjectHierarchyLevels(objectTree);
        return objectTree;
    }
}

function updateDatatypeParams(params: SepticCalcParameterInfo[] | undefined) {
    if (!params) {
        return [];
    }
    return params.map((param) => {
        return {
            arity: param.arity,
            description: param.description,
            name: param.name,
            direction: param.direction,
            datatype: param.datatype.map((type) => {
                return datatypeToObjectName(type);
            }),
        };
    });
}

const objectNameMap = new Map<string, string>([
    ["mvr", "Mvr"],
    ["cvr", "Cvr"],
    ["dvr", "Dvr"],
    ["evr", "Evr"],
    ["tvr", "Tvr"],
    ["smpcappl", "SmpcAppl"],
]);

export const VALUE = "Value";

function datatypeToObjectName(type: string) {
    let objectName = objectNameMap.get(type);
    if (!objectName) {
        return VALUE;
    }
    return objectName;
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
    attributes: SepticAttributeDocumentation[] = [];
    description: string;
    parents: string[];
    publicAttributes: string[] = [];
    attrMap: Map<string, SepticAttributeDocumentation> = new Map<
        string,
        SepticAttributeDocumentation
    >();

    constructor(input: SepticObjectDocumentationInput) {
        this.setAttributes(input.attributes);
        this.name = input.name;
        this.description = input.description;
        this.parents = input.parents;
        this.attributes.forEach((attr) => this.attrMap.set(attr.name, attr));
    }

    public getAttribute(
        attr: string
    ): SepticAttributeDocumentation | undefined {
        return this.attrMap.get(attr);
    }

    private setAttributes(attrs: SepticAttributeDocumentation[]) {
        for (let attr of attrs) {
            if (attr.calc) {
                this.publicAttributes.push(attr.name);
            }
            if (attr.noCnfg) {
                continue;
            }
            if (attr.postfix.length) {
                attr.postfix.forEach((pf) => {
                    this.attributes.push({
                        description: attr.description,
                        dataType: attr.dataType,
                        enums: attr.enums,
                        list: attr.list,
                        name: attr.name + pf,
                        tags: attr.tags,
                        calc: attr.calc,
                        postfix: [],
                        noCnfg: false,
                        default: attr.default,
                        snippet: attr.snippet,
                        noSnippet: attr.noSnippet,
                    });
                });
                continue;
            }
            this.attributes.push(attr);
        }
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

export interface SepticObjectSnippet {
    prefix: string;
    body: string[];
    description: string;
}

export interface ISepticObjectDocumentation {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    parents: string[];
    publicAttributes: string[];
    getAttribute(attr: string): SepticAttributeDocumentation | undefined;
}

export interface SepticObjectDocumentationInput {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    parents: string[];
}

export interface SepticAttributeDocumentation {
    description: string;
    dataType: string;
    enums: string[];
    list: boolean;
    name: string;
    tags: string[];
    calc: boolean;
    postfix: string[];
    noCnfg: boolean;
    default: string[];
    snippet: string;
    noSnippet: boolean;
}

export interface SepticCalcInfoInput {
    name: string;
    signature?: string;
    parameters?: SepticCalcParameterInfo[];
    retr?: string;
    briefDescription?: string;
    detailedDescription?: string;
    quality?: string;
}

export interface SepticCalcInfo {
    name: string;
    signature: string;
    parameters: SepticCalcParameterInfo[];
    retr: string;
    briefDescription: string;
    detailedDescription: string;
    quality: string;
}

export interface SepticCalcParameterInfo {
    name: string;
    description: string;
    direction: string;
    datatype: string[];
    arity: string;
}

export interface SepticRefs {
    identifier: boolean;
    identifierOptional: boolean;
    attributes: string[];
}

export interface SepticMetaInfoInput {
    objects: SepticObjectsInfoInput[];
    calcs: SepticCalcInfoInput[];
}

export interface SepticRefsInput {
    identifier?: boolean;
    identifierOptional?: boolean;
    attributes?: string[];
}
export class SepticObjectNode {
    name: string;
    children: string[] = [];
    parents: string[] = [];
    level: number = -1;

    constructor(name: string) {
        this.name = name;
    }

    addChild(name: string) {
        if (this.children.includes(name)) {
            return;
        }
        this.children.push(name);
    }

    addParent(name: string) {
        if (this.parents.includes(name)) {
            return;
        }
        this.parents.push(name);
    }

    setLevel(level: number) {
        this.level = level;
    }
}

export interface SepticObjectHierarchy {
    nodes: Map<string, SepticObjectNode>;
    rootNode: SepticObjectNode;
}

export function createSepticObjectTree(
    objects: ISepticObjectDocumentation[]
): SepticObjectHierarchy {
    const nodes: Map<string, SepticObjectNode> = new Map<
        string,
        SepticObjectNode
    >();
    for (let obj of objects) {
        let node = nodes.get(obj.name);
        if (!node) {
            node = new SepticObjectNode(obj.name);
            nodes.set(obj.name, node);
        }
        obj.parents.forEach((parent) => {
            node?.addParent(parent);
        });
        for (let parent of obj.parents) {
            let parentNode = nodes.get(parent);
            if (!parentNode) {
                parentNode = new SepticObjectNode(parent);
                nodes.set(parent, parentNode);
            }
            parentNode.addChild(obj.name);
        }
    }
    let roots: SepticObjectNode[] = [];
    nodes.forEach((value) => {
        if (!value.parents.length) {
            roots.push(value);
        }
    });
    if (roots.length !== 1) {
        console.log("Incorrect number of roots in object documentation tree");
    }
    return { nodes: nodes, rootNode: roots[0] };
}

export function updateObjectHierarchyLevels(tree: SepticObjectHierarchy) {
    updateObjectLevel(tree.rootNode, 0, tree.nodes);
}

function updateObjectLevel(
    node: SepticObjectNode,
    level: number,
    nodes: Map<string, SepticObjectNode>
) {
    node.setLevel(level);
    node.children.forEach((child) => {
        let childNode = nodes.get(child);
        updateObjectLevel(childNode!, level + 1, nodes);
    });
}
