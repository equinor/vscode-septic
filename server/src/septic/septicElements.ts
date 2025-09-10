/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { removeJinjaLoopsAndIfs, removeSpaces } from "../util";
import { AlgExpr, parseAlg } from './algParser';
import { SepticTokenType } from "./septicTokens";

export class SepticBase {
    start: number;
    end: number;
    uri: string = "";

    constructor(start: number = -1, end: number = -1) {
        this.start = start;
        this.end = end;
    }

    updateEnd(): void {
        return;
    }

    getElements(): SepticBase[] {
        return [];
    }

    setUri(uri: string) {
        this.uri = uri;
    }
}

export class SepticComment extends SepticBase {
    content: string;
    type: SepticTokenType;

    constructor(
        content: string,
        type: SepticTokenType,
        start: number = -1,
        end: number = -1
    ) {
        super(start, end);
        this.content = content;
        this.type = type;
    }

    getElements(): SepticBase[] {
        return [this];
    }
}

export class SepticObject extends SepticBase {
    type: string;
    identifier: Identifier | undefined;
    attributes: Attribute[];
    parent: SepticObject | undefined;
    children: SepticObject[] = [];
    isXvr: boolean;
    isSopcXvr: boolean;
    isUaXvr: boolean;
    isOpcXvr: boolean;

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
        this.parent = undefined;
        this.isXvr = /^[CDEMT]vr$/.test(this.type);
        this.isSopcXvr = /^Sopc[CDEMT]vr$/.test(this.type);
        this.isUaXvr = /^UA[CDEMT]vr$/.test(this.type);
        this.isOpcXvr = this.isSopcXvr || this.isUaXvr;
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

    getElements(): SepticBase[] {
        const elements: SepticBase[] = [this];
        if (this.identifier) {
            elements.push(...this.identifier.getElements());
        }
        this.attributes.forEach((attr) => {
            elements.push(...attr.getElements());
        });
        return elements;
    }

    isType(...type: string[]) {
        return type.includes(this.type);
    }

    setParent(parent: SepticObject | undefined) {
        this.parent = parent;
    }

    addChild(child: SepticObject) {
        this.children.push(child);
    }

    resetChildren() {
        this.children = [];
    }

    resetParent() {
        this.parent = undefined;
    }

    parseAlg(): { algExpr: AlgExpr, positionsMap: number[] } | undefined {
        const algAttr = this.getAttribute("Alg");
        if (!algAttr) {
            return undefined;
        }
        let expr;
        const algString = algAttr.getValue() || "";
        const { strippedString, positionsMap } = removeJinjaLoopsAndIfs(algString);
        try {
            expr = parseAlg(strippedString);
        } catch {
            return undefined;
        }
        return { algExpr: expr, positionsMap: positionsMap };
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

    getElements(): SepticBase[] {
        const elements: SepticBase[] = [this];
        this.values.forEach((attrValue) => {
            elements.push(...attrValue.getElements());
        });
        return elements;
    }

    getAttrValue(): AttributeValue | undefined {
        return this.values?.[0];
    }

    getAttrValues(): AttributeValue[] {
        return this.values;
    }

    getValue(): string | undefined {
        if (!this.values.length) {
            return undefined;
        }
        return this.values[0].getValue();
    }

    getValues(): string[] {
        return this.values.map((val) => val.getValue());
    }

    getType(): ValueTypes | undefined {
        if (!this.values.length) {
            return undefined;
        }

        const list = this.values.length > 1;
        const type: SepticTokenType = list
            ? this.values[1].type
            : this.values[0].type;

        switch (type) {
            case SepticTokenType.numeric:
                return list ? ValueTypes.numericList : ValueTypes.numeric;
            case SepticTokenType.string:
                return list ? ValueTypes.stringList : ValueTypes.string;
            default:
                return ValueTypes.default;
        }
    }

    isKey(key: string) {
        return key === this.key;
    }
}

export class Identifier extends SepticBase {
    name: string;
    id: string;

    constructor(name: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.name = name;
        this.id = removeSpaces(name);
    }

    getElements(): SepticBase[] {
        return [this];
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

    getElements(): SepticBase[] {
        return [this];
    }

    getValue(): string {
        if (this.type === SepticTokenType.string) {
            return this.value.substring(1, this.value.length - 1);
        }
        return this.value;
    }
}

export enum ValueTypes {
    string = 1,
    numeric = 3,
    stringList = 4,
    numericList = 5,
    default = 6,
}
