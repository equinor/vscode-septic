/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AlgVisitor, parseAlg } from "./algParser";
import { SepticTokenType } from "./septicTokens";
import { SepticMetaInfoProvider } from "./septicMetaInfo";
import { identifier } from "@babel/types";

export interface SepticReference {
    identifier: string;
    location: {
        start: number;
        end: number;
    };
    obj?: SepticObject;
}

export class SepticCnfg {
    public objects: SepticObject[];
    readonly xvrRefs = new Map<string, SepticReference[]>();
    private xvrRefsExtracted = false;

    constructor(objects: SepticObject[]) {
        this.objects = objects;
    }

    public getAlgAttrs(): Attribute[] {
        const objects: Attribute[] = [];
        this.objects.forEach((obj) => {
            if (obj.type === "CalcPvr") {
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
        return this.xvrRefs.get(name);
    }

    public getAllXvrObjects(): SepticObject[] {
        this.extractXvrRefs();
        const xvrs: SepticObject[] = [];
        this.xvrRefs.forEach((xvr) => {
            xvr.forEach((ref) => {
                if (ref.obj) {
                    xvrs.push(ref.obj);
                }
            });
        });
        return xvrs;
    }

    public offsetInAlg(offset: number): boolean {
        const obj = this.getObjectFromOffset(offset);
        if (!obj) {
            return false;
        }
        const alg = obj.getAttribute("Alg");
        if (!alg) {
            return false;
        }
        if (!alg.values.length) {
            return false;
        }
        let algValue = alg.values[0];
        if (offset >= algValue.start && offset <= algValue.end) {
            return true;
        }
        return false;
    }

    public getObjectFromOffset(offset: number): SepticObject | undefined {
        return this.objects.find((obj) => {
            return offset >= obj.start && offset <= obj.end;
        });
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

    private extractXvrRefs(): void {
        if (this.xvrRefsExtracted) {
            return;
        }
        this.xvrRefsExtracted = true;
        this.objects.forEach((obj) => {
            extractXvrRefs(obj).forEach((xvr) => {
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

export class SepticBase {
    start: number;
    end: number;

    constructor(start: number = -1, end: number = -1) {
        this.start = start;
        this.end = end;
    }

    updateEnd(): void {
        return;
    }
}

export class SepticObject extends SepticBase {
    type: string;
    identifier: Identifier | undefined;
    attributes: Attribute[];

    constructor(
        type: string,
        variable: Identifier | undefined,
        start: number = -1,
        end: number = -1
    ) {
        super(start, end);
        this.type = type;
        this.identifier = variable;
        this.attributes = [];
    }

    addAttribute(attr: Attribute) {
        this.attributes.push(attr);
    }

    updateEnd(): void {
        this.identifier?.updateEnd();
        this.attributes.forEach((elem) => {
            elem.updateEnd();
        });
        if (this.attributes.length) {
            this.end = this.attributes[this.attributes.length - 1].end;
        } else if (this.identifier) {
            this.end = this.identifier.end;
        }
    }

    getAttribute(name: string): Attribute | undefined {
        return this.attributes.find((attr) => {
            return attr.key === name;
        });
    }
}

export class Attribute extends SepticBase {
    values: AttributeValue[];
    key: string;

    constructor(key: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.values = [];
        this.key = key;
    }

    addValue(value: AttributeValue) {
        this.values.push(value);
    }

    updateEnd(): void {
        if (this.values.length) {
            this.end = this.values[this.values.length - 1].end;
        }
    }
}

export class Identifier extends SepticBase {
    name: string;

    constructor(name: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.name = name.replace(/\s/g, "");
    }
}

export class AttributeValue extends SepticBase {
    value: string;
    type: SepticTokenType;

    constructor(
        value: string,
        type: SepticTokenType,
        start: number = -1,
        end: number = -1
    ) {
        super(start, end);
        this.value = value;
        this.type = type;
    }
}

export function extractXvrRefs(obj: SepticObject): SepticReference[] {
    const xvrRefs: SepticReference[] = [];
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objectDef = metaInfoProvider.getObject(obj.type);
    if (!objectDef) {
        return [];
    }

    if (objectDef.refs.identifier) {
        if (obj.identifier) {
            let ref: SepticReference = {
                identifier: obj.identifier.name,
                location: {
                    start: obj.identifier.start,
                    end: obj.identifier.end,
                },
                obj: obj,
            };
            xvrRefs.push(ref);
        }
    }

    objectDef.refs.attrList.forEach((attr) => {
        xvrRefs.push(...xvrRefsAttrList(obj, attr));
    });

    objectDef.refs.attr.forEach((attr) => {
        xvrRefs.push(...xvrRefAttr(obj, attr));
    });

    if (obj.type === "CalcPvr") {
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
        expr = parseAlg(
            alg.values[0].value.substring(1, alg.values[0].value.length - 1)
        );
    } catch (e: any) {
        return [];
    }
    const visitor = new AlgVisitor();
    visitor.visit(expr);

    visitor.variables.forEach((xvr) => {
        let identifier = xvr.value.split(".")[0];
        const ref: SepticReference = {
            identifier: identifier,
            location: {
                start: alg!.values[0].start + xvr.start + 1,
                end: alg!.values[0].start + xvr.start + identifier.length + 1,
            },
        };
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
        return {
            identifier: ref.value.substring(1, ref.value.length - 1),
            location: {
                start: ref.start + 1,
                end: ref.end - 1,
            },
        };
    });
}

function xvrRefAttr(obj: SepticObject, attrName: string): SepticReference[] {
    let attr = obj.getAttribute(attrName);
    if (!attr || !attr.values.length) {
        return [];
    }
    return [
        {
            identifier: attr.values[0].value.substring(
                1,
                attr.values[0].value.length - 1
            ),
            location: {
                start: attr.values[0].start + 1,
                end: attr.values[0].end - 1,
            },
        },
    ];
}
