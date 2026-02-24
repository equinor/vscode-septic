/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { removeJinjaLoopsAndIfs, removeSpaces } from "./util";
import { AlgExpr, parseAlg } from "./alg";

import { IToken } from "./util/parser";

export enum SepticTokenType {
    object,
    attribute,
    blockComment,
    lineComment,
    jinjaComment,
    jinjaExpression,
    numeric,
    string,
    skip,
    unknown,
    identifier,
    path,
    eof = "eof",
}

const indentsObjectDeclaration = 2;
const startObjectName = 17;
const spacesBetweenValues = 2;
const spacesBetweenIntValues = 6;
const indentsAttributeValuesStart = 17;
const maxNumberAttrValuesPerLine = 5;
const indentsAttributesDelimiter = 14;

export type SepticToken = IToken<SepticTokenType>;

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
        end: number = -1,
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
    identifier: SepticIdentifier | undefined;
    attributes: SepticAttribute[];
    parent: SepticObject | undefined;
    children: SepticObject[] = [];
    isXvr: boolean;
    isSopcXvr: boolean;
    isUaXvr: boolean;
    isOpcXvr: boolean;

    constructor(
        type: string,
        variable: SepticIdentifier | undefined,
        start: number = -1,
        end: number = -1,
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

    addAttribute(attr: SepticAttribute) {
        this.attributes.push(attr);
    }

    updateEnd(): void {
        this.identifier?.updateEnd();
        this.attributes.forEach((elem) => {
            elem.updateEnd();
        });
        if (this.attributes.length) {
            this.end = this.attributes[this.attributes.length - 1]!.end;
        } else if (this.identifier) {
            this.end = this.identifier.end;
        }
    }

    getAttribute(name: string): SepticAttribute | undefined {
        return this.attributes.find((attr) => {
            return attr.key === name;
        });
    }

    hasAttribute(name: string): boolean {
        const attr = this.getAttribute(name);
        return attr !== undefined;
    }

    getAttributeFirstValue(name: string): string | undefined {
        return this.getAttribute(name)?.getFirstValue();
    }

    getAttributeValues(name: string): string[] {
        return this.getAttribute(name)?.getValues() ?? [];
    }

    getAttributeValueObjects(name: string): SepticAttributeValue[] {
        return this.getAttribute(name)?.getAttributeValueObjects() ?? [];
    }

    getAttributeFirstValueObject(
        name: string,
    ): SepticAttributeValue | undefined {
        return this.getAttribute(name)?.getFirstAttributeValueObject();
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

    parseAlg(): { algExpr: AlgExpr; positionsMap: number[] } | undefined {
        let expr;
        const algString = this.getAttributeFirstValue("Alg") ?? "";
        const { strippedString, positionsMap } =
            removeJinjaLoopsAndIfs(algString);
        try {
            expr = parseAlg(strippedString);
        } catch {
            return undefined;
        }
        return { algExpr: expr, positionsMap: positionsMap };
    }

    toString(): string {
        const identifierStr = this.identifier ? ` ${this.identifier.name}` : "";
        const objectTypeFormatted =
            " ".repeat(indentsObjectDeclaration) + this.type + ":";
        const indentsName = Math.max(
            startObjectName - objectTypeFormatted.length - 1,
            2,
        );
        const objectDeclartionFormatted =
            objectTypeFormatted + " ".repeat(indentsName) + identifierStr;
        return (
            objectDeclartionFormatted +
            "\n" +
            this.attributes
                .map((attr) => {
                    return attr.toString();
                })
                .join("\n") +
            "\n"
        );
    }
}

export class SepticAttribute extends SepticBase {
    values: SepticAttributeValue[];
    key: string;

    constructor(key: string, start: number = -1, end: number = -1) {
        super(start, end);
        this.values = [];
        this.key = key;
    }

    addValue(value: SepticAttributeValue) {
        this.values.push(value);
    }

    setValues(values: SepticAttributeValue[]) {
        this.values = values;
    }

    updateEnd(): void {
        if (this.values.length) {
            this.end = this.values[this.values.length - 1]!.end;
        }
    }

    getElements(): SepticBase[] {
        const elements: SepticBase[] = [this];
        this.values.forEach((attrValue) => {
            elements.push(...attrValue.getElements());
        });
        return elements;
    }

    getFirstAttributeValueObject(): SepticAttributeValue | undefined {
        return this.values?.[0];
    }

    getAttributeValueObjects(): SepticAttributeValue[] {
        return this.values;
    }

    getFirstValue(): string | undefined {
        if (!this.values.length) {
            return undefined;
        }
        return this.values[0]!.getValue();
    }

    getValues(): string[] {
        return this.values.map((val) => val.getValue());
    }

    getType(): SepticValueTypes | undefined {
        if (!this.values.length) {
            return undefined;
        }

        const list = this.values.length > 1;
        const type: SepticTokenType = list
            ? this.values[1]!.type
            : this.values[0]!.type;

        switch (type) {
            case SepticTokenType.numeric:
                return list
                    ? SepticValueTypes.numericList
                    : SepticValueTypes.numeric;
            case SepticTokenType.string:
                return list
                    ? SepticValueTypes.stringList
                    : SepticValueTypes.string;
            default:
                return SepticValueTypes.default;
        }
    }

    isKey(key: string) {
        return key === this.key;
    }

    toString(): string {
        const indentsKey = Math.max(
            indentsAttributesDelimiter - this.key.length,
            0,
        );
        const attrDefFormatted = " ".repeat(indentsKey) + this.key + "=  ";
        if (this.getType() === SepticValueTypes.stringList) {
            return (
                attrDefFormatted +
                formatStringList(this.values.map((val) => val.value))
            );
        } else if (this.getType() === SepticValueTypes.numericList) {
            return (
                attrDefFormatted +
                formatNumericList(this.values.map((val) => val.value))
            );
        } else if (this.getValues().length > 1) {
            return (
                attrDefFormatted +
                formatList(this.values.map((val) => val.value))
            );
        } else {
            return attrDefFormatted + (this.values[0]?.value || "");
        }
    }
}

function formatStringList(values: string[]): string {
    let formatted = `${values.length - 1}`;
    values.slice(1).forEach((val, ind) => {
        if (ind % maxNumberAttrValuesPerLine === 0) {
            formatted += "\n" + " ".repeat(indentsAttributeValuesStart) + val;
        } else {
            formatted += " ".repeat(spacesBetweenValues) + val;
        }
    });
    return formatted;
}

function formatNumericList(values: string[]): string {
    let formatted = `${values.length - 1}`;
    values.slice(1).forEach((val, ind) => {
        const spaces = Math.max(spacesBetweenIntValues - val.length, 1);
        formatted +=
            ind === 0 ? " ".repeat(spaces - 1) + val : " ".repeat(spaces) + val;
    });
    return formatted;
}

function formatList(values: string[]): string {
    let formatted = `${values.length - 1}`;
    values.forEach((val) => {
        formatted += " ".repeat(spacesBetweenValues) + val;
    });
    return formatted;
}

export class SepticIdentifier extends SepticBase {
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

export class SepticAttributeValue extends SepticBase {
    value: string;
    type: SepticTokenType;

    constructor(
        value: string,
        type: SepticTokenType,
        start: number = -1,
        end: number = -1,
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

export enum SepticValueTypes {
    string = 1,
    numeric = 3,
    stringList = 4,
    numericList = 5,
    default = 6,
}
