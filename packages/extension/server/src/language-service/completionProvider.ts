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
import { ISepticConfigProvider } from "../configProvider";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    AlgVisitor,
    Attribute,
    SepticObjectHierarchy,
    SepticAttributeDocumentation,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticContext,
    SepticCalcInfo,
    formatCalcMarkdown,
    formatDefaultValue,
    formatObjectAttribute,
    parseAlg,
    formatObjectInstance,
} from "septic";
import { indentsAttributesDelimiter } from "./formatProvider";
import { isAlphaNumeric } from "../util";
import { CompletionSettings, SettingsManager } from "../settings";
import { SepticSnippetProvider } from "../snippets";

const threeLettersOrLessWordsRegex = /\b[\w]{1,3}\b/;

export class CompletionProvider {
    private readonly cnfgProvider: ISepticConfigProvider;
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(
        cnfgProvider: ISepticConfigProvider,
        settingsManager: SettingsManager,
    ) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideCompletion(
        params: CompletionParams,
        contextProvider: SepticContext,
    ): Promise<CompletionItem[]> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        const settings = await this.settingsManager.getSettings();
        await contextProvider.load();
        return getCompletion(
            params.position,
            params.context?.triggerCharacter,
            cnfg,
            contextProvider,
            settings?.completion || { onlySuggestValidSnippets: false },
        );
    }
}

export function getCompletion(
    pos: Position,
    triggerCharacter: string | undefined,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
    settings: CompletionSettings = { onlySuggestValidSnippets: false },
): CompletionItem[] {
    const offset = cnfg.offsetAt(pos);
    const alg = cnfg.findAlgValueFromLocation(pos);
    if (alg) {
        if (triggerCharacter === ".") {
            return getPublicAttributesCompletion(offset, cnfg, contextProvider);
        }
        return getCalcCompletion(offset, cnfg, contextProvider);
    }
    return getObjectCompletion(pos, cnfg, contextProvider, settings);
}

export function getPublicAttributesCompletion(
    offset: number,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): CompletionItem[] {
    const algValue = cnfg.findAlgValueFromLocation(offset);
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
    const offsetCharInAlg = offset - (algValue.start + 1);
    for (const variable of visitor.variables) {
        if (offsetCharInAlg !== variable.end) {
            continue;
        }
        const variableCore = variable.value.slice(0, variable.value.length - 1);
        const objects = contextProvider.getObjectsByIdentifier(variableCore);
        for (const obj of objects) {
            if (!obj.isXvr) {
                continue;
            }
            const metaInfoProvider = SepticMetaInfoProvider.getInstance();
            const objDoc = metaInfoProvider.getObjectDocumentation(obj.type);
            if (!objDoc) {
                continue;
            }
            return objDoc.publicAttributes.map((prop) =>
                CompletionItemFactory.fromPublicProperty(prop, obj.type),
            );
        }
    }
    return [];
}

export function getCalcCompletion(
    offset: number,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
): CompletionItem[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const compItems: CompletionItem[] = [];
    const ref = cnfg.findReferenceFromLocation(offset);
    let range: Range;
    if (ref) {
        range = {
            start: cnfg.positionAt(ref.location.start),
            end: cnfg.positionAt(ref.location.end),
        };
    } else {
        const pos = cnfg.positionAt(offset);
        const line = cnfg.getText({
            start: Position.create(pos.line, 0),
            end: Position.create(pos.line, Infinity),
        });
        const existing = getExistingCompletion(line, pos.character - 1);
        range = {
            start: cnfg.positionAt(offset - existing.str.length),
            end: pos,
        };
    }

    getRelevantXvrsCalc(contextProvider.getAllXvrObjects()).forEach((xvr) => {
        compItems.push(CompletionItemFactory.fromXvr(xvr, range));
    });

    const calcs = metaInfoProvider.getCalcs();
    for (const calc of calcs) {
        compItems.push(CompletionItemFactory.fromCalc(calc));
    }
    return compItems;
}

export function getObjectCompletion(
    position: Position,
    cnfg: SepticCnfg,
    contextProvider: SepticContext,
    settings: CompletionSettings = { onlySuggestValidSnippets: false },
): CompletionItem[] {
    cnfg.updateObjectParents();
    contextProvider.updateObjectParents();
    const objectSnippets: CompletionItem[] = getRelevantObjectSnippets(
        position,
        contextProvider,
        cnfg.doc,
        settings.onlySuggestValidSnippets,
    );
    const obj = cnfg.findObjectFromLocation(position);
    if (!obj) {
        return objectSnippets;
    }
    const offset = cnfg.offsetAt(position);
    const range = findCompletionRange(offset, cnfg, cnfg.doc);
    if (isIdentifierCompletion(offset, obj)) {
        return getIdentifierCompletion(obj, contextProvider, range);
    }
    const currentAttr = findCurrentAttr(offset, obj);
    if (!currentAttr.attr) {
        return [
            ...objectSnippets,
            ...getObjectAttributeCompletion(obj, offset, cnfg.doc),
        ];
    }
    const completions = getAttributeValueCompletion(
        obj,
        currentAttr.attr,
        contextProvider,
        range,
    );
    if (isEndAttribute(offset, currentAttr.attr)) {
        completions.push(
            ...getObjectAttributeCompletion(obj, offset, cnfg.doc),
        );
        if (currentAttr.last) {
            completions.push(...objectSnippets);
        }
    }
    return completions;
}

function getObjectAttributeCompletion(
    obj: SepticObject,
    offset: number,
    doc: TextDocument,
) {
    const objDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        obj.type,
    );
    if (!objDoc) {
        return [];
    }
    const compItems: CompletionItem[] = [];
    const rangeNewLine = findRangeAttrTextEdit(offset, doc);
    for (const attr of objDoc.attributes) {
        if (obj.getAttribute(attr.name)) {
            continue;
        }
        compItems.push(CompletionItemFactory.fromAttribute(attr, rangeNewLine));
    }
    return compItems;
}

function getIdentifierCompletion(
    obj: SepticObject,
    refProvider: SepticContext,
    range: Range,
): CompletionItem[] {
    return getRelevantXvrsIdentifier(obj, refProvider.getAllXvrObjects()).map(
        (obj) => CompletionItemFactory.fromXvr(obj, range),
    );
}

function getAttributeValueCompletion(
    obj: SepticObject,
    attr: Attribute,
    refProvider: SepticContext,
    range: Range,
): CompletionItem[] {
    const references = getReferenceCompletions(obj, attr, refProvider, range);
    const enums = getEnumCompletions(obj, attr);
    return [...references, ...enums];
}

function getReferenceCompletions(
    obj: SepticObject,
    attr: Attribute,
    refProvider: SepticContext,
    range: Range,
): CompletionItem[] {
    if (!isReferenceAttribute(obj, attr)) {
        return [];
    }
    return getRelevantXvrsAttributes(attr, refProvider.getAllXvrObjects()).map(
        (obj) => CompletionItemFactory.fromXvr(obj, range),
    );
}

function getEnumCompletions(
    obj: SepticObject,
    attr: Attribute,
): CompletionItem[] {
    const objectInfo =
        SepticMetaInfoProvider.getInstance().getObjectDocumentation(obj.type);
    if (!objectInfo) {
        return [];
    }
    const attrDoc = objectInfo.attributes.find((a) => a.name === attr.key);
    if (!attrDoc) {
        return [];
    }
    if (attrDoc.dataType !== "enum") {
        return [];
    }
    return attrDoc.enums.map((value) =>
        CompletionItemFactory.fromEnum(value, attrDoc),
    );
}

function isIdentifierCompletion(offset: number, obj: SepticObject) {
    const objectInfo = SepticMetaInfoProvider.getInstance().getObject(obj.type);
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
    return objectInfo.refs.attributes.includes(attr.key);
}

function isEndAttribute(offset: number, attr: Attribute): boolean {
    return offset >= attr.end;
}

function getTextAttrTextEdit(attr: SepticAttributeDocumentation) {
    const hasDefault = attr.default.length > 0;
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

function findRangeAttrTextEdit(
    offset: number,
    doc: TextDocument,
): { range: Range; addNewLine: boolean } {
    const pos = doc.positionAt(offset);
    const line = doc.getText({
        start: Position.create(pos.line, 0),
        end: Position.create(pos.line, Infinity),
    });
    const existing = getExistingCompletion(line, pos.character - 1);
    const isOnlyTextOnLine =
        existing.endIndex < 0 ||
        line.slice(0, existing.endIndex).trim().length === 0;
    const startChar = isOnlyTextOnLine
        ? 0
        : pos.character - existing.str.length;
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
    startIndex: number,
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

function getRelevantXvrsCalc(objects: SepticObject[]) {
    return objects.filter((obj) => obj.isXvr);
}

function getRelevantXvrsIdentifier(
    obj: SepticObject,
    objects: SepticObject[],
): SepticObject[] {
    if (obj.isXvr) {
        return objects.filter((xvr) =>
            xvr.isType("Sopc" + obj.type, "UA" + obj.type),
        );
    } else if (obj.isOpcXvr) {
        return objects.filter((xvr) =>
            xvr.isType(obj.type.slice(obj.type.length - 3)),
        );
    } else if (obj.isType("CalcPvr")) {
        return objects.filter((xvr) => xvr.isType("Evr"));
    } else {
        return objects.filter((xvr) => xvr.isXvr);
    }
}

function getRelevantXvrsAttributes(
    attr: Attribute,
    objects: SepticObject[],
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
            return objects.filter((obj) => obj.isXvr);
    }
}

function getRelevantObjectSnippets(
    pos: Position,
    contextProvider: SepticContext,
    doc: TextDocument,
    onlySuggestValidSnippets: boolean,
): CompletionItem[] {
    const snippets = SepticSnippetProvider.getInstance().getSnippets().slice();
    if (!onlySuggestValidSnippets) {
        return snippets;
    }
    const obj = contextProvider.findObjectFromLocation(pos, doc.uri);
    if (!obj) {
        return snippets.filter((snippet) => snippet.label.startsWith("system"));
    }
    const objectHierarchy =
        SepticMetaInfoProvider.getInstance().getObjectHierarchy();
    const relevantObjects = getObjectsSnippets(objectHierarchy, obj);
    return snippets.filter((snippet) =>
        relevantObjects.includes(snippet.label),
    );
}

function getObjectsSnippets(
    objectHierarchy: SepticObjectHierarchy,
    obj: SepticObject,
): string[] {
    let node = objectHierarchy.nodes.get(obj.type);
    let currentObject: SepticObject | undefined = obj;
    if (!node) {
        return [];
    }
    const relevantObjects: string[] = [];
    relevantObjects.push(...node.children);
    while (node) {
        let parentType = "";
        if (currentObject?.parent) {
            parentType = currentObject.parent.type;
        } else {
            parentType = node.parents.length ? node.parents[0] : "";
        }
        node = objectHierarchy.nodes.get(parentType);
        if (node) {
            relevantObjects.push(node.name);
            relevantObjects.push(...node.children);
        }
        currentObject = currentObject?.parent;
    }

    return relevantObjects.map((val) => val.toLowerCase());
}

function findCompletionRange(
    offset: number,
    cnfg: SepticCnfg,
    doc: TextDocument,
) {
    const ref = cnfg.findReferenceFromLocation(offset);
    const range: Range = ref
        ? {
              start: doc.positionAt(ref.location.start),
              end: doc.positionAt(ref.location.end),
          }
        : {
              start: doc.positionAt(offset),
              end: doc.positionAt(offset),
          };
    return range;
}

function findCurrentAttr(
    offset: number,
    obj: SepticObject,
): { attr: Attribute | undefined; last: boolean } {
    if (!obj.attributes.length) {
        return { attr: undefined, last: false };
    }
    let index = 1;
    while (index < obj.attributes.length) {
        if (obj.attributes[index].start >= offset) {
            return { attr: obj.attributes[index - 1], last: false };
        }
        index += 1;
    }
    return { attr: obj.attributes[obj.attributes.length - 1], last: true };
}

const XVR_TYPE_PRIORITY: Record<string, number> = {
    Mvr: 1,
    Cvr: 2,
    Dvr: 3,
    Evr: 4,
    Tvr: 5,
};

const ENUM_PRIORITY = 1;
const REFERENCE_PRIORITY = 2;
const ATTRIBUTE_PRIORITY = 3;
const CALC_PRIORITY = 4;
const PUBLIC_PROPERTY_PRIORITY = 5;
const DEFAULT_PRIORITY = 6;

class CompletionItemFactory {
    static fromXvr(obj: SepticObject, range: Range): CompletionItem {
        const priority = XVR_TYPE_PRIORITY[obj.type] ?? DEFAULT_PRIORITY;
        return {
            label: obj.identifier!.name,
            kind: CompletionItemKind.Variable,
            detail: obj.type,
            documentation: {
                value: formatObjectInstance(obj),
                kind: "markdown",
            },
            filterText: obj.identifier!.id + obj.identifier!.name,
            sortText: `${REFERENCE_PRIORITY}${priority}${obj.identifier!.id}`,
            textEdit: TextEdit.replace(range, obj.identifier!.name),
            labelDetails: { detail: ` ${obj.type}` },
        };
    }
    static fromCalc(calc: SepticCalcInfo): CompletionItem {
        return {
            label: calc.name,
            kind: CompletionItemKind.Function,
            detail: "SepticCalc",
            documentation: {
                value: formatCalcMarkdown(calc),
                kind: "markdown",
            },
            sortText: `${CALC_PRIORITY}${calc.name}`,
            filterText:
                calc.name +
                " " +
                calc.detailedDescription.replace(
                    threeLettersOrLessWordsRegex,
                    "",
                ),
            commitCharacters: ["("],
            labelDetails: { detail: ` Calc` },
        };
    }
    static fromPublicProperty(
        property: string,
        objType: string,
    ): CompletionItem {
        return {
            label: property,
            kind: CompletionItemKind.Property,
            detail: `${objType}.${property}`,
            sortText: `${PUBLIC_PROPERTY_PRIORITY}${property}`,
            labelDetails: { detail: ` ${objType}.${property}` },
        };
    }
    static fromAttribute(
        attr: SepticAttributeDocumentation,
        rangeNewLine: { range: Range; addNewLine: boolean },
    ): CompletionItem {
        const text = rangeNewLine.addNewLine
            ? "\n" + getTextAttrTextEdit(attr)
            : getTextAttrTextEdit(attr);

        return {
            label: attr.name,
            kind: CompletionItemKind.Property,
            detail: "Object Attribute",
            documentation: {
                value: formatObjectAttribute(attr, true),
                kind: "markdown",
            },
            sortText: `${ATTRIBUTE_PRIORITY}${attr.name}`,
            textEdit: TextEdit.replace(rangeNewLine.range, text),
            insertTextMode: InsertTextMode.asIs,
            insertTextFormat: InsertTextFormat.Snippet,
            labelDetails: { detail: ` Attribute` },
        };
    }
    static fromEnum(
        value: string,
        attrDoc: SepticAttributeDocumentation,
    ): CompletionItem {
        return {
            label: value,
            kind: CompletionItemKind.EnumMember,
            detail: `Enum Value ${attrDoc.name}`,
            documentation: {
                value: `${attrDoc.description}`,
                kind: "markdown",
            },
            sortText: `${ENUM_PRIORITY}${value}`,
            labelDetails: { detail: ` Enum` },
        };
    }
}
