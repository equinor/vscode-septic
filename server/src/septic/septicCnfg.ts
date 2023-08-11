/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AlgVisitor, parseAlg } from "./algParser";
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
} from "./reference";
import { removeSpaces } from "../util";
import { updateParentObjects } from "./hierarchy";
import { Alg, Cycle, findAlgCycles } from "./cycle";

export class SepticCnfg implements SepticReferenceProvider {
    public objects: SepticObject[];
    public comments: SepticComment[];
    public cycles: Cycle[] = [];
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
                let algAttr = obj.getAttribute("Alg");
                if (algAttr) {
                    objects.push(algAttr);
                }
            }
        });
        return objects;
    }

    public getXvrRefs(name: string): SepticReference[] | undefined {
        this.extractXvrRefs();
        return this.xvrRefs.get(removeSpaces(name));
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
        return this.objects.filter((obj) => obj.isXvr() || obj.isSopcXvr());
    }

    public getObjectsByIdentifier(identifier: string): SepticObject[] {
        let identifierSpacesRemoved = removeSpaces(identifier);
        return this.objects.filter((obj) => {
            if (!obj.identifier) {
                return false;
            }
            return (
                removeSpaces(obj.identifier.name) === identifierSpacesRemoved
            );
        });
    }

    public offsetInAlg(offset: number): undefined | AttributeValue {
        const obj = this.getObjectFromOffset(offset);
        if (!obj) {
            return undefined;
        }
        const alg = obj.getAttribute("Alg");
        let algValue = alg?.getAttrValue();
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
        let algValue = alg?.getAttrValue();
        if (!algValue) {
            return undefined;
        }

        if (offset >= algValue.start && offset <= algValue.end) {
            return alg;
        }
        return undefined;
    }

    public getObjectFromOffset(offset: number): SepticObject | undefined {
        if (!this.objects.length) {
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

    public getXvrRefFromOffset(offset: number): SepticReference | undefined {
        this.extractXvrRefs();
        for (const xvrRef of this.xvrRefs.values()) {
            let validRef = xvrRef.find((ref) => {
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

    public getCalcPvrs(): SepticObject[] {
        return this.objects.filter((obj) => obj.isType("CalcPvr"));
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

    private extractXvrRefs(): void {
        if (this.xvrRefsExtracted) {
            return;
        }
        this.xvrRefsExtracted = true;
        this.objects.forEach((obj) => {
            extractXvrRefs(obj).forEach((xvr) => {
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
}

export function extractXvrRefs(obj: SepticObject): SepticReference[] {
    const xvrRefs: SepticReference[] = [];
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objectDef = metaInfoProvider.getObject(obj.type);
    if (!objectDef) {
        return [];
    }

    if (objectDef.refs.identifier && obj.identifier) {
        let isObjRef = obj.isXvr() || obj.isSopcXvr() || obj.isType("CalcPvr");
        let ref: SepticReference = createSepticReference(
            obj.identifier.name,
            {
                uri: "",
                start: obj.identifier.start,
                end: obj.identifier.end,
            },
            isObjRef ? obj : undefined
        );
        xvrRefs.push(ref);
    }

    objectDef.refs.attrList.forEach((attr) => {
        xvrRefs.push(...attrXvrRefs(obj, attr));
    });

    if (obj.isType("CalcPvr")) {
        xvrRefs.push(...calcPvrXvrRefs(obj));
    }
    return xvrRefs;
}

function calcPvrXvrRefs(obj: SepticObject): SepticReference[] {
    const xvrs: SepticReference[] = [];
    let alg = obj.getAttribute("Alg");
    if (!alg) {
        return [];
    }
    let expr;
    try {
        expr = parseAlg(alg.getValue() ?? "");
    } catch (e: any) {
        return [];
    }
    const visitor = new AlgVisitor();
    visitor.visit(expr);

    visitor.variables.forEach((xvr) => {
        let identifier = xvr.value.split(".")[0];
        const ref: SepticReference = createSepticReference(identifier, {
            uri: "",
            start: alg!.getAttrValue()!.start + xvr.start + 1,
            end: alg!.getAttrValue()!.start + xvr.end + 1,
        });
        xvrs.push(ref);
    });
    return xvrs;
}

function attrXvrRefs(obj: SepticObject, attrName: string): SepticReference[] {
    let attr = obj.getAttribute(attrName);
    if (!attr) {
        return [];
    }
    let sliceIndex = attr.values.length < 2 ? 0 : 1;
    let refs = attr.values.slice(sliceIndex).filter((val) => {
        return (
            val.type === SepticTokenType.string ||
            val.type === SepticTokenType.identifier
        );
    });
    return refs.map((ref) => {
        return createSepticReference(ref.getValue(), {
            uri: "",
            start: ref.start + 1,
            end: ref.end - 1,
        });
    });
}
