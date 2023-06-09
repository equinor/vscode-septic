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
}

export class SepticComment extends SepticBase {
    content: string;

    constructor(content: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.content = content;
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
