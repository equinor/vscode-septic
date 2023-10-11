/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CompletionItem,
    CompletionItemKind,
    Position,
    TextEdit,
    InsertTextMode,
    InsertTextFormat,
    Range,
    CompletionParams,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgVisitor,
    Attribute,
    SepticAttributeDocumentation,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticReferenceProvider,
    formatCalcMarkdown,
    formatDefaultValue,
    formatObjectAttribute,
    parseAlg,
} from "../septic";
import { indentsAttributesDelimiter } from "./formatProvider";
import { isAlphaNumeric } from "../util";

const threeLettersOrLessWordsRegex = /\b[\w]{1,3}\b/;
export class CompletionProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideCompletion(
        params: CompletionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<CompletionItem[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        await refProvider.load();
        return getCompletion(
            params.position,
            params.context?.triggerCharacter,
            cnfg,
            doc,
            refProvider
        );
    }
}

export function getCompletion(
    pos: Position,
    triggerCharacter: string | undefined,
    cnfg: SepticCnfg,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): CompletionItem[] {
    const offset = doc.offsetAt(pos);
    const alg = cnfg.offsetInAlg(offset);
    if (alg) {
        if (triggerCharacter === ".") {
            return getCalcPublicPropertiesCompletion(offset, cnfg, refProvider);
        }
        return getCalcCompletion(offset, cnfg, refProvider);
    }
    return getObjectCompletion(offset, cnfg, refProvider, doc);
}

export function getCalcPublicPropertiesCompletion(
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider
): CompletionItem[] {
    let algValue = cnfg.offsetInAlg(offset);
    if (!algValue) {
        return [];
    }
    let expr;
    try {
        expr = parseAlg(algValue.getValue());
    } catch {
        return [];
    }
    const visitor = new AlgVisitor();
    visitor.visit(expr);
    let offsetCharInAlg = offset - (algValue.start + 1);
    for (let variable of visitor.variables) {
        if (offsetCharInAlg !== variable.end) {
            continue;
        }
        let variableCore = variable.value.slice(0, variable.value.length - 1);
        let objects = refProvider.getObjectsByIdentifier(variableCore);
        for (let obj of objects) {
            if (!obj.isXvr()) {
                continue;
            }
            let metaInfoProvider = SepticMetaInfoProvider.getInstance();
            let objDoc = metaInfoProvider.getObjectDocumentation(obj.type);
            if (!objDoc) {
                continue;
            }
            return publicPropertiesToCompletionItems(
                objDoc.publicAttributes,
                obj.type
            );
        }
    }
    return [];
}

function publicPropertiesToCompletionItems(
    properties: string[],
    objType: string
): CompletionItem[] {
    return properties.map((prop) => {
        return {
            label: prop,
            kind: CompletionItemKind.Property,
            detail: `Public property for ${objType}`,
        };
    });
}

export function getCalcCompletion(
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider
): CompletionItem[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const compItems: CompletionItem[] = [];
    const obj = cnfg.getObjectFromOffset(offset);
    if (!obj) {
        return [];
    }
    const relevantXvrs = getRelevantXvrsIdentifier(
        obj,
        refProvider.getAllXvrObjects()
    );
    relevantXvrs.forEach((xvr) => {
        compItems.push(xvrToCompletionItem(xvr));
    });
    let calcs = metaInfoProvider.getCalcs();
    for (let calc of calcs) {
        compItems.push({
            label: calc.name,
            kind: CompletionItemKind.Function,
            detail: "SepticCalc",
            data: calc,
            documentation: {
                value: formatCalcMarkdown(calc),
                kind: "markdown",
            },
            filterText:
                calc.name +
                " " +
                calc.detailedDescription.replace(
                    threeLettersOrLessWordsRegex,
                    ""
                ),
            commitCharacters: ["("],
        });
    }
    return compItems;
}

export function getObjectCompletion(
    offset: number,
    cnfg: SepticCnfg,
    refProvider: SepticReferenceProvider,
    doc: ITextDocument
): CompletionItem[] {
    const compItems: CompletionItem[] = [];
    const obj = cnfg.getObjectFromOffset(offset);
    if (!obj) {
        return [];
    }
    if (isIdentifierCompletion(offset, obj)) {
        return getRelevantXvrsIdentifier(
            obj,
            refProvider.getAllXvrObjects()
        ).map((obj) => xvrToCompletionItem(obj));
    }
    const currentAttr = getCurrentAttr(offset, obj);
    if (!currentAttr) {
        return getObjectAttributeCompletion(obj, offset, doc);
    }
    if (isReferenceAttribute(obj, currentAttr)) {
        compItems.push(
            ...getRelevantXvrsAttributes(
                currentAttr,
                refProvider.getAllXvrObjects()
            ).map((obj) => xvrToCompletionItem(obj))
        );
    }
    if (isEndAttribute(offset, currentAttr)) {
        compItems.push(...getObjectAttributeCompletion(obj, offset, doc));
    }
    return compItems;
}

function getCurrentAttr(
    offset: number,
    obj: SepticObject
): Attribute | undefined {
    if (!obj.attributes.length) {
        return undefined;
    }
    let index = 1;
    while (index < obj.attributes.length) {
        if (obj.attributes[index].start >= offset) {
            return obj.attributes[index - 1];
        }
        index += 1;
    }
    return obj.attributes[obj.attributes.length - 1];
}

function getObjectAttributeCompletion(
    obj: SepticObject,
    offset: number,
    doc: ITextDocument
) {
    const objDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        obj.type
    );
    if (!objDoc) {
        return [];
    }
    const compItems: CompletionItem[] = [];
    const rangeNewLine = getRangeAttrTextEdit(offset, doc);
    for (let attr of objDoc.attributes) {
        if (obj.getAttribute(attr.name)) {
            continue;
        }
        let text = rangeNewLine.addNewLine
            ? "\n" + getTextAttrTextEdit(attr)
            : getTextAttrTextEdit(attr);
        compItems.push({
            label: attr.name,
            kind: CompletionItemKind.Property,
            detail: "SepticObjectAttribute",
            documentation: {
                value: formatObjectAttribute(attr),
                kind: "markdown",
            },
            textEdit: TextEdit.replace(rangeNewLine.range, text),
            insertTextMode: InsertTextMode.asIs,
            insertTextFormat: InsertTextFormat.Snippet,
        });
    }
    return compItems;
}

function isIdentifierCompletion(offset: number, obj: SepticObject) {
    let objectInfo = SepticMetaInfoProvider.getInstance().getObject(obj.type);
    if (!objectInfo?.refs.identifier) {
        return false;
    }
    if (!obj.identifier) {
        if (!obj.attributes.length) {
            return true;
        }
        if (offset < obj.attributes[0].start) {
            return true;
        }
        return false;
    }
    if (
        offset - 1 >= obj.identifier.start &&
        offset - 1 <= obj.identifier.end
    ) {
        return true;
    }
    return false;
}

function isReferenceAttribute(obj: SepticObject, attr: Attribute): boolean {
    const objectInfo = SepticMetaInfoProvider.getInstance().getObject(obj.type);
    if (!objectInfo) {
        return false;
    }
    return objectInfo.refs.attrList.includes(attr.key);
}

function isEndAttribute(offset: number, attr: Attribute): boolean {
    return offset >= attr.end;
}

function getTextAttrTextEdit(attr: SepticAttributeDocumentation) {
    let hasDefault = attr.default.length > 0;
    let attrFormatted =
        " ".repeat(Math.max(indentsAttributesDelimiter - attr.name.length, 0)) +
        attr.name +
        "=" +
        "  ";
    attrFormatted += hasDefault
        ? "${1:" + formatDefaultValue(attr.default) + "}"
        : "${1}";
    return attrFormatted;
}

function getRangeAttrTextEdit(
    offset: number,
    doc: ITextDocument
): { range: Range; addNewLine: boolean } {
    let pos = doc.positionAt(offset);
    let line = doc.getText({
        start: Position.create(pos.line, 0),
        end: Position.create(pos.line, Infinity),
    });
    let existing = getExistingCompletion(line, pos.character - 1);
    let isOnlyTextOnLine =
        existing.endIndex < 0 ||
        line.slice(0, existing.endIndex).trim().length === 0;
    let startChar = isOnlyTextOnLine ? 0 : pos.character - existing.str.length;
    return {
        range: {
            start: Position.create(pos.line, startChar),
            end: Position.create(pos.line, line.length),
        },
        addNewLine: !isOnlyTextOnLine,
    };
}

function getExistingCompletion(
    line: string,
    startIndex: number
): { str: string; endIndex: number } {
    let existing = "";
    let index = startIndex;
    while (index >= 0) {
        if (isAlphaNumeric(line[index])) {
            existing += line[index];
            index -= 1;
        } else {
            break;
        }
    }
    return {
        str: existing.split("").reverse().join(""),
        endIndex: index,
    };
}

function xvrToCompletionItem(obj: SepticObject): CompletionItem {
    return {
        label: obj.identifier!.name,
        kind: CompletionItemKind.Variable,
        detail: obj.type,
        data: obj.identifier!.name,
    };
}

function getRelevantXvrsIdentifier(
    obj: SepticObject,
    objects: SepticObject[]
): SepticObject[] {
    if (obj.isXvr()) {
        return objects.filter((xvr) => xvr.isType("Sopc" + obj.type));
    } else if (obj.isSopcXvr()) {
        return objects.filter((xvr) => xvr.isType(obj.type.slice(4)));
    } else {
        return objects.filter((xvr) => xvr.isXvr());
    }
}

function getRelevantXvrsAttributes(
    attr: Attribute,
    objects: SepticObject[]
): SepticObject[] {
    switch (attr.key) {
        case "Cvrs":
        case "CvrIds":
            return objects.filter((obj) => obj.isType("Cvr"));
        case "Evrs":
            return objects.filter((obj) => obj.isType("Evr"));
        case "Dvrs":
            return objects.filter((obj) => obj.isType("Dvr"));
        case "Tvrs":
            return objects.filter((obj) => obj.isType("Tvr"));
        case "Mvrs":
            return objects.filter((obj) => obj.isType("Mvr"));
        case "MvrDvrIds":
            return objects.filter((obj) => obj.isType("Mvr", "Dvr"));
        default:
            return objects.filter((obj) => obj.isXvr());
    }
}
