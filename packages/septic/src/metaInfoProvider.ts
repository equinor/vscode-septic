/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as YAML from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { getBasePublicPath } from "./path";

export const defaultObjectLevel = 2;
export const defaultObjectSymbolKind = "object";

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
    private snippetsInfo: SepticObjectSnippet[];
    private calcsMap: Map<string, SepticCalcInfo>;
    private objectsMap: Map<string, SepticObjectInfo>;
    private objectsDocMap: Map<string, ISepticObjectDocumentation>;
    private objectHierarchy: SepticObjectHierarchy;
    private version: string;

    private constructor(version: string) {
        this.version = version;
        this.calcsMap = this.loadCalcsInfo(version);
        this.objectsMap = this.loadObjectsInfo();
        this.objectsDocMap = this.loadObjectsDocumentation(version);
        this.objectHierarchy = this.loadObjectHierarchy(
            Array.from(this.objectsDocMap.values()),
        );
        this.snippetsInfo = this.loadSnippetsInfo(version);
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

    public static getAvailableVersions(): string[] {
        const basePath = getBasePublicPath();
        const versions = fs
            .readdirSync(basePath, { withFileTypes: true })
            .filter(
                (entry) =>
                    entry.isDirectory() && entry.name.match(/^v?\d+(_\d+)*$/),
            )
            .map((entry) => entry.name.replace(/_/g, "."));
        return versions;
    }

    public static setVersion(version: string): void {
        SepticMetaInfoProvider.version = version;
    }

    public static getVersion(): string {
        return this.version;
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

    public getObjectsDoc(): SepticObjectDoc[] {
        return [...this.objectsDocMap.values()].map((doc) =>
            doc.getObjectDoc(),
        );
    }

    public getObjectDefault(objectType: string): SepticObjectInfo {
        const obj = this.objectsMap.get(objectType);
        if (obj) {
            return obj;
        }
        return defaultObject;
    }

    public getSnippets(): SepticObjectSnippet[] {
        return this.snippetsInfo;
    }

    public hasObject(objectType: string): boolean {
        return this.objectsMap.has(objectType);
    }

    public updateObjectLevel(objectType: string, level: number): void {
        const obj = this.objectsMap.get(objectType);
        if (!obj) {
            return;
        }
        obj.level = level;
    }

    public getObjectDocumentation(
        objectType: string,
    ): ISepticObjectDocumentation | undefined {
        return this.objectsDocMap.get(objectType);
    }

    public getObjectHierarchy(): SepticObjectHierarchy {
        return this.objectHierarchy;
    }

    private loadCalcsInfo(version: string): Map<string, SepticCalcInfo> {
        const basePath = getBasePublicPath();
        const filePath = path.join(
            basePath,
            `${version.replace(/\./g, "_")}`,
            "calcs.yaml",
        );
        const file = fs.readFileSync(filePath, "utf-8");
        const calcInfo: SepticCalcInfoInput[] = YAML.load(
            file,
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
        const calcsMap = new Map<string, SepticCalcInfo>();
        for (const calc of calcs) {
            calcsMap.set(calc.name, calc);
        }
        return calcsMap;
    }

    private loadObjectsInfo(): Map<string, SepticObjectInfo> {
        const basePath = getBasePublicPath();
        const filePath = path.join(basePath, "objects.yaml");
        const file = fs.readFileSync(filePath, "utf-8");
        const objectsInfo: SepticObjectsInfoInput[] = YAML.load(
            file,
        ) as SepticObjectsInfoInput[];
        const objects: SepticObjectInfo[] = objectsInfo.map((obj) => {
            return {
                name: obj.name,
                level: obj.level ? obj.level : defaultObjectLevel,
                symbolKind: obj.symbolKind ?? defaultObjectSymbolKind,
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
        const objectsMap = new Map<string, SepticObjectInfo>();
        for (const obj of objects) {
            objectsMap.set(obj.name, obj);
        }
        return objectsMap;
    }

    private loadObjectsDocumentation(
        version: string,
    ): Map<string, ISepticObjectDocumentation> {
        const basePath = getBasePublicPath();
        const filePath = path.join(
            basePath,
            `${version.replace(/\./g, "_")}`,
            "objectsDoc.yaml",
        );
        const file = fs.readFileSync(filePath, "utf-8");
        const objectsDoc: SepticObjectDocumentationInput[] = YAML.load(
            file,
        ) as SepticObjectDocumentationInput[];
        const objectsDocMap = new Map<string, ISepticObjectDocumentation>();
        for (const obj of objectsDoc) {
            objectsDocMap.set(obj.name, new SepticObjectDocumentation(obj));
        }
        return objectsDocMap;
    }

    private loadSnippetsInfo(version: string): SepticObjectSnippet[] {
        const basePath = getBasePublicPath();
        const filePath = path.join(
            basePath,
            `${version.replace(/\./g, "_")}`,
            "snippets.yaml",
        );
        const file = fs.readFileSync(filePath, "utf-8");
        const objectSnippets: SepticObjectSnippet[] = YAML.load(
            file,
        ) as SepticObjectSnippet[];
        return objectSnippets;
    }

    private loadObjectHierarchy(
        objectsDoc: ISepticObjectDocumentation[],
    ): SepticObjectHierarchy {
        const objectTree = createSepticObjectTree(objectsDoc);
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
            datatype: param.datatype,
        };
    });
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
        attr: string,
    ): SepticAttributeDocumentation | undefined {
        return this.attrMap.get(attr);
    }

    public getObjectDoc(): SepticObjectDoc {
        return {
            name: this.name,
            attributes: this.attributes,
            description: this.description,
            parents: this.parents,
            publicAttributes: this.publicAttributes,
        };
    }

    private setAttributes(attrs: SepticAttributeDocumentationInput[]) {
        for (const attr of attrs) {
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
                        basename: attr.name,
                        noCnfg: false,
                        default: attr.default,
                        snippet: attr.snippet,
                        noSnippet: attr.noSnippet,
                    });
                });
                continue;
            } else {
                this.attributes.push({
                    description: attr.description,
                    dataType: attr.dataType,
                    enums: attr.enums,
                    list: attr.list,
                    name: attr.name,
                    tags: attr.tags,
                    calc: attr.calc,
                    basename: attr.name,
                    noCnfg: false,
                    default: attr.default,
                    snippet: attr.snippet,
                    noSnippet: attr.noSnippet,
                });
            }
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
    symbolKind: string;
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
    getObjectDoc(): SepticObjectDoc;
}

export interface SepticObjectDoc {
    name: string;
    attributes: SepticAttributeDocumentation[];
    description: string;
    parents: string[];
    publicAttributes: string[];
}

export interface SepticObjectDocumentationInput {
    name: string;
    attributes: SepticAttributeDocumentationInput[];
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
    basename: string;
    noCnfg: boolean;
    default: string[];
    snippet: string;
    noSnippet: boolean;
}

export interface SepticAttributeDocumentationInput {
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
    objects: ISepticObjectDocumentation[],
): SepticObjectHierarchy {
    const nodes: Map<string, SepticObjectNode> = new Map<
        string,
        SepticObjectNode
    >();
    for (const obj of objects) {
        let node = nodes.get(obj.name);
        if (!node) {
            node = new SepticObjectNode(obj.name);
            nodes.set(obj.name, node);
        }
        obj.parents.forEach((parent) => {
            node?.addParent(parent);
        });
        for (const parent of obj.parents) {
            let parentNode = nodes.get(parent);
            if (!parentNode) {
                parentNode = new SepticObjectNode(parent);
                nodes.set(parent, parentNode);
            }
            parentNode.addChild(obj.name);
        }
    }
    const roots: SepticObjectNode[] = [];
    nodes.forEach((value) => {
        if (!value.parents.length) {
            roots.push(value);
        }
    });
    if (roots.length !== 1) {
        console.log("Incorrect number of roots in object documentation tree");
    }
    return { nodes: nodes, rootNode: roots[0]! };
}

export function updateObjectHierarchyLevels(tree: SepticObjectHierarchy) {
    updateObjectLevel(tree.rootNode, 0, tree.nodes);
}

function updateObjectLevel(
    node: SepticObjectNode,
    level: number,
    nodes: Map<string, SepticObjectNode>,
) {
    node.setLevel(level);
    node.children.forEach((child) => {
        const childNode = nodes.get(child);
        updateObjectLevel(childNode!, level + 1, nodes);
    });
}
