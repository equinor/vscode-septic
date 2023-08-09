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
import { Attribute, SepticComment, SepticObject } from "./septicElements";
import {
    SepticReference,
    SepticReferenceProvider,
    RefValidationFunction,
    defaultRefValidationFunction,
    createSepticReference,
} from "./reference";
import { removeSpaces } from "../util";
import { updateParentObjects } from "./hierarchy";

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

    public offsetInAlg(offset: number): boolean {
        const obj = this.getObjectFromOffset(offset);
        if (!obj) {
            return false;
        }
        const alg = obj.getAttribute("Alg");
        let algValue = alg?.getAttrValue();
        if (!algValue) {
            return false;
        }

        if (offset >= algValue.start && offset <= algValue.end) {
            return true;
        }
        return false;
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

    public getObjectFromOffset(offset: number): SepticObject {
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
        let isObjRef = obj.isXvr() || obj.isSopcXvr();
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
        xvrRefs.push(...xvrRefsAttrList(obj, attr));
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

function xvrRefsAttrList(
    obj: SepticObject,
    attrName: string
): SepticReference[] {
    let attr = obj.getAttribute(attrName);
    if (!attr || attr.values.length < 2) {
        return [];
    }
    let refs = attr.values.slice(1).filter((val) => {
        return val.type === SepticTokenType.string;
    });
    return refs.map((ref) => {
        return createSepticReference(ref.getValue(), {
            uri: "",
            start: ref.start + 1,
            end: ref.end - 1,
        });
    });
}
