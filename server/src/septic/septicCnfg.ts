/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AlgVisitor } from "./algParser";
import { SepticTokenType } from "./septicTokens";
import {
    SepticMetaInfoProvider,
    SepticObjectHierarchy,
} from "./septicMetaInfo";
import {
    Attribute,
    AttributeValue,
    SepticComment,
    SepticObject,
} from "./septicElements";
import {
    SepticReference,
    SepticReferenceProvider,
    RefValidationFunction,
    defaultRefValidationFunction,
    createSepticReference,
    ReferenceType,
} from "./reference";
import { removeSpaces, transformPositionsToOriginal } from "../util";
import { updateParentObjects } from "./hierarchy";
import { Alg, Cycle, findAlgCycles } from "./cycle";

export class SepticCnfg implements SepticReferenceProvider {
    public objects: SepticObject[];
    public comments: SepticComment[];
    private xvrRefs = new Map<string, SepticReference[]>();
    private xvrRefsExtracted = false;
    public uri: string = "";

    constructor(objects: SepticObject[], comments: SepticComment[] = []) {
        this.objects = objects;
        this.comments = comments;
    }

    public async load(): Promise<void> {
        return Promise.resolve();
    }

    public setUri(uri: string) {
        this.uri = uri;
        this.objects.forEach((obj) => {
            obj.setUri(uri);
        });
    }

    public getAlgAttrs(): Attribute[] {
        const objects: Attribute[] = [];
        this.objects.forEach((obj) => {
            if (obj.isType("CalcPvr")) {
                const algAttr = obj.getAttribute("Alg");
                if (algAttr) {
                    objects.push(algAttr);
                }
            }
        });
        return objects;
    }

    public getXvrRefs(name: string): SepticReference[] | undefined {
        this.extractReferences();
        return this.xvrRefs.get(removeSpaces(name));
    }

    public validateRef(
        name: string,
        validationFunction: RefValidationFunction = defaultRefValidationFunction
    ): boolean {
        const xvrRefs = this.getXvrRefs(name);
        if (!xvrRefs) {
            return false;
        }
        return validationFunction(xvrRefs);
    }

    public getAllXvrObjects(): SepticObject[] {
        return this.objects.filter((obj) => obj.isXvr || obj.isOpcXvr);
    }

    public getObjectsByType(...types: string[]): SepticObject[] {
        return this.objects.filter((obj) => obj.isType(...types));
    }

    public getObjectsByIdentifier(identifier: string): SepticObject[] {
        const identifierSpacesRemoved = removeSpaces(identifier);
        return this.objects.filter((obj) => {
            if (!obj.identifier) {
                return false;
            }
            return obj.identifier.id === identifierSpacesRemoved;
        });
    }

    public getObjectByIdentifierAndType(
        identifier: string,
        type: string
    ): SepticObject | undefined {
        const identifierSpacesRemoved = removeSpaces(identifier);
        return this.objects.find((val) => {
            if (!val.identifier) {
                return false;
            }
            return (
                removeSpaces(val.identifier.name) === identifierSpacesRemoved &&
                val.type === type
            );
        });
    }

    public offsetInAlg(offset: number): undefined | AttributeValue {
        const obj = this.getObjectFromOffset(offset);
        if (!obj) {
            return undefined;
        }
        const alg = obj.getAttribute("Alg");
        const algValue = alg?.getAttrValue();
        if (!algValue) {
            return undefined;
        }

        if (offset >= algValue.start && offset <= algValue.end) {
            return algValue;
        }
        return undefined;
    }

    public getAlgFromOffset(offset: number): Attribute | undefined {
        const obj = this.getObjectFromOffset(offset);
        if (!obj) {
            return undefined;
        }
        const alg = obj.getAttribute("Alg");
        const algValue = alg?.getAttrValue();
        if (!algValue) {
            return undefined;
        }

        if (offset >= algValue.start && offset <= algValue.end) {
            return alg;
        }
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getObjectFromOffset(offset: number, uri: string = ""): SepticObject | undefined {
        if (!this.objects.length) {
            return undefined;
        }
        if (offset < this.objects[0].start) {
            return undefined;
        }
        let index = 1;
        while (index < this.objects.length) {
            if (this.objects[index].start >= offset) {
                return this.objects[index - 1];
            }
            index += 1;
        }
        return this.objects[this.objects.length - 1];
    }

    public getObjectsInRange(start: number, end: number): SepticObject[] {
        return this.objects.filter((obj) => {
            return obj.start >= start && obj.end <= end;
        });
    }

    public getXvrRefFromOffset(offset: number): SepticReference | undefined {
        this.extractReferences();
        for (const xvrRef of this.xvrRefs.values()) {
            const validRef = xvrRef.find((ref) => {
                return (
                    offset >= ref.location.start && offset <= ref.location.end
                );
            });
            if (validRef) {
                return validRef;
            }
        }
        return undefined;
    }

    public updateObjectParents(
        hierarchy: SepticObjectHierarchy
    ): Promise<void> {
        updateParentObjects(this.objects, hierarchy);
        return Promise.resolve();
    }

    private extractReferences(): void {
        if (this.xvrRefsExtracted) {
            return;
        }
        this.xvrRefsExtracted = true;
        this.objects.forEach((obj) => {
            extractReferencesFromObj(obj).forEach((xvr) => {
                xvr.location.uri = this.uri;
                this.addXvrRef(xvr);
            });
        });
    }

    private addXvrRef(ref: SepticReference) {
        if (this.xvrRefs.has(ref.identifier)) {
            this.xvrRefs.get(ref.identifier)?.push(ref);
        } else {
            this.xvrRefs.set(ref.identifier, [ref]);
        }
    }

    public findAlgCycles(): Cycle[] {
        const calcPvrs = this.objects.filter((obj) => obj.isType("CalcPvr"));
        const algs: Alg[] = [];
        for (const calcPvr of calcPvrs) {
            const alg = calcPvr.getAttribute("Alg");
            const content = alg?.getAttrValue()?.getValue();
            if (!content || !calcPvr.identifier?.name) {
                continue;
            }
            algs.push({
                calcPvrName: removeSpaces(calcPvr.identifier.name),
                content: content,
            });
        }
        return findAlgCycles(algs);
    }

    public getRootFunctions(): SepticFunction[] {
        const calcModels = this.objects.filter((obj) => obj.isType("CalcModl"));
        const functions: SepticFunction[] = [];
        for (const calcModel of calcModels) {
            const functionsInModel = this.getFunctionInCalcModel(calcModel);
            functions.push(...functionsInModel);
        }
        return functions;
    }

    public getFunctionInCalcModel(calcModel: SepticObject): SepticFunction[] {
        const nodes = calcModel.children.filter((child) => child.identifier?.id).map((child) => {
            return {
                obj: child,
                name: child.identifier!.id,
                parents: [],
                children: [],
                inputs: [],
                visited: false,
            };
        });
        nodes.reverse()
        for (const node of nodes) {
            this.visitNode(node, nodes, []);
        }
        const rootNodes = nodes.filter((node) => node.parents.length === 0);
        const functions: SepticFunction[] = rootNodes.map((node) => this.createFunctionFromNode(node));
        return functions;
    }

    private createFunctionFromNode(node: SepticFunctionNode): SepticFunction {
        const allNodes = [node, ...getDescendants(node)];
        const visited = new Set<SepticFunctionNode>();
        const sorted: SepticFunctionNode[] = [];

        function visit(n: SepticFunctionNode) {
            if (visited.has(n)) return;
            visited.add(n);
            for (const child of n.children) {
                visit(child);
            }
            sorted.push(n);
        }
        for (const n of allNodes) {
            visit(n);
        }

        const lines = sorted.map((child) => {
            return {
                name: child.name,
                alg: child.obj.getAttribute("Alg")?.getValue() || "",
                doc: child.obj.getAttribute("Text1")?.getValue() || "",
            };
        });
        const inputs = Array.from(new Set(allNodes.map((n) => n.inputs).flat()));
        return {
            name: node.name,
            lines: lines,
            inputs: inputs,
        };
    }

    private visitNode(node: SepticFunctionNode, allNodes: SepticFunctionNode[], ancestors: string[]) {
        if (node.visited) {
            return;
        }
        node.visited = true;
        const parsedAlg = node.obj.parseAlg();
        if (!parsedAlg) {
            return;
        }
        const visitor = new AlgVisitor();
        visitor.visit(parsedAlg.algExpr);
        visitor.variables.forEach((xvr) => {
            const name = xvr.value.split(".")[0];
            const refNode = allNodes.find((n) => n.name === name);
            if (refNode) {
                refNode.parents.push(node);
                if (ancestors.includes(refNode.name)) {
                    node.inputs.push(refNode.name);
                } else {
                    node.children.push(refNode);
                }
                this.visitNode(refNode, allNodes, [...ancestors, node.name]);

            } else {
                node.inputs.push(name);
            }
        });
    }
}

function getDescendants(node: SepticFunctionNode, visited = new Set<SepticFunctionNode>()): SepticFunctionNode[] {
    const descendants: SepticFunctionNode[] = [];
    for (const child of node.children) {
        if (!visited.has(child)) {
            visited.add(child);
            descendants.push(child, ...getDescendants(child, visited));
        }
    }
    return descendants;
};

export function printFunctionInfo(func: SepticFunction) {
    console.log(`function ${func.name}(${func.inputs.join(", ")})`);
    func.lines.forEach((line, idx) => {
        if (idx === func.lines.length - 1) {
            // Last line: print as return statement
            const textLine = line.doc
                ? `   return ${line.alg} #${line.doc}`
                : `   return ${line.alg}`;
            console.log(textLine);
        } else {
            const textLine = line.doc
                ? `   ${line.name} = ${line.alg} #${line.doc}`
                : `   ${line.name} = ${line.alg}`;
            console.log(textLine);
        }
    });
}

interface SepticFunctionNode {
    obj: SepticObject;
    name: string;
    parents: SepticFunctionNode[];
    children: SepticFunctionNode[];
    inputs: string[];
    visited: boolean;
}

export interface SepticFunction {
    name: string;
    lines: SepticFunctionLine[];
    inputs: string[];
}

export interface SepticFunctionLine {
    name: string;
    alg: string;
    doc: string;
}


export function extractReferencesFromObj(obj: SepticObject): SepticReference[] {
    const xvrRefs: SepticReference[] = [];
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objectDef = metaInfoProvider.getObject(obj.type);
    if (!objectDef) {
        return [];
    }

    if (objectDef.refs.identifier && obj.identifier) {
        const isObjRef = obj.isXvr || obj.isOpcXvr || obj.isType("CalcPvr");
        const ref: SepticReference = createSepticReference(
            obj.identifier.name,
            {
                uri: "",
                start: obj.identifier.start,
                end: obj.identifier.end,
            },
            isObjRef ? obj : undefined,
            isObjRef
                ? ReferenceType.xvr
                : ReferenceType.identifier
        );
        xvrRefs.push(ref);
    }

    objectDef.refs.attributes.forEach((attr) => {
        xvrRefs.push(...attributeReferences(obj, attr));
    });

    if (obj.isType("CalcPvr")) {
        xvrRefs.push(...calcPvrReferences(obj));
    }
    return xvrRefs;
}

function calcPvrReferences(obj: SepticObject): SepticReference[] {
    const refs: SepticReference[] = [];
    const parsedAlg = obj.parseAlg();
    if (!parsedAlg) {
        return [];
    }
    const visitor = new AlgVisitor();
    visitor.visit(parsedAlg.algExpr);

    visitor.variables.forEach((xvr) => {
        const identifier = xvr.value.split(".")[0];
        let start = xvr.start;
        const diff = xvr.end - xvr.start;
        if (parsedAlg.positionsMap.length) {
            const originalPositions = transformPositionsToOriginal([start], parsedAlg.positionsMap);
            start = originalPositions[0];
        }
        const ref: SepticReference = createSepticReference(
            identifier,
            {
                uri: "",
                start: obj.getAttribute("Alg")!.getAttrValue()!.start + start + 1,
                end: obj.getAttribute("Alg")!.getAttrValue()!.start + start + diff + 1,
            },
            undefined,
            ReferenceType.calc
        );
        refs.push(ref);
    });
    return refs;
}

function attributeReferences(obj: SepticObject, attrName: string): SepticReference[] {
    const attr = obj.getAttribute(attrName);
    if (!attr) {
        return [];
    }
    const sliceIndex = attr.values.length < 2 ? 0 : 1;
    const refs = attr.values.slice(sliceIndex).filter((val) => {
        return (
            val.type === SepticTokenType.string ||
            val.type === SepticTokenType.identifier
        );
    });
    return refs.map((ref) => {
        return createSepticReference(
            ref.getValue(),
            {
                uri: "",
                start:
                    ref.type === SepticTokenType.string
                        ? ref.start + 1
                        : ref.start,
                end:
                    ref.type === SepticTokenType.string ? ref.end - 1 : ref.end,
            },
            undefined,
            ReferenceType.attribute
        );
    });
}