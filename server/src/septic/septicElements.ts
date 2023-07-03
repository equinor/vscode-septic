/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticTokenType } from "./septicTokens";

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

    getElements(): SepticBase[] {
        return [];
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

    getElements(): SepticBase[] {
        let elements: SepticBase[] = [this];
        if (this.identifier) {
            elements.push(...this.identifier.getElements());
        }
        this.attributes.forEach((attr) => {
            elements.push(...attr.getElements());
        });
        return elements;
    }

    isXvr(): boolean {
        return /^[CDEMT]vr$/.test(this.type);
    }

    isSopcXvr(): boolean {
        return /^Sopc[CDEMT]vr$/.test(this.type);
    }

    isType(...type: string[]) {
        return type.includes(this.type);
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
        let elements: SepticBase[] = [this];
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
        return this.values?.[0].getValue();
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

    constructor(name: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.name = name;
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
