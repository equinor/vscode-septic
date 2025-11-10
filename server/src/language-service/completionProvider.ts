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
import { ITextDocument } from "../types/textDocument";
import {
    AlgVisitor,
    Attribute,
    SepticObjectHierarchy,
    SepticAttributeDocumentation,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticContext,
    formatCalcMarkdown,
    formatDefaultValue,
    formatObjectAttribute,
    parseAlg,
} from "../septic";
import { indentsAttributesDelimiter } from "./formatProvider";
import { isAlphaNumeric } from "../util";
import { CompletionSettings, SettingsManager } from '../settings';

const threeLettersOrLessWordsRegex = /\b[\w]{1,3}\b/;
export class CompletionProvider {
    private readonly cnfgProvider: ISepticConfigProvider;
    private readonly settingsManager: SettingsManager;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider, settingsManager: SettingsManager) {
        this.cnfgProvider = cnfgProvider;
        this.settingsManager = settingsManager;
    }

    /* istanbul ignore next */
    public async provideCompletion(
        params: CompletionParams,
        doc: ITextDocument,
        contextProvider: SepticContext
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
            doc,
            contextProvider,
            settings?.completion || { onlySuggestValidSnippets: false }
        );
    }
}

export function getCompletion(
    pos: Position,
    triggerCharacter: string | undefined,
    cnfg: SepticCnfg,
    doc: ITextDocument,
    contextProvider: SepticContext,
    settings: CompletionSettings = { onlySuggestValidSnippets: false }
): CompletionItem[] {
    const offset = doc.offsetAt(pos);
    const alg = cnfg.locationInAlg(offset);
    if (alg) {
        if (triggerCharacter === ".") {
            return getCalcPublicPropertiesCompletion(offset, cnfg, contextProvider);
        }
        return getCalcCompletion(offset, cnfg, doc, contextProvider);
    }
    return getObjectCompletion(offset, cnfg, contextProvider, doc, settings);
}

export function getCalcPublicPropertiesCompletion(
    offset: number,
    cnfg: SepticCnfg,
    contextProvider: SepticContext
): CompletionItem[] {
    const algValue = cnfg.locationInAlg(offset);
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
    doc: ITextDocument,
    contextProvider: SepticContext
): CompletionItem[] {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const compItems: CompletionItem[] = [];
    const ref = cnfg.findReferenceFromLocation(offset);
    let range: Range;
    if (ref) {
        range = {
            start: doc.positionAt(ref.location.start),
            end: doc.positionAt(ref.location.end),
        };
    } else {
        const pos = doc.positionAt(offset);
        const line = doc.getText({
            start: Position.create(pos.line, 0),
            end: Position.create(pos.line, Infinity),
        });
        const existing = getExistingCompletion(line, pos.character - 1);
        range = {
            start: doc.positionAt(offset - existing.str.length),
            end: pos,
        };
    }

    getRelevantXvrsCalc(contextProvider.getAllXvrObjects()).forEach((xvr) => {
        compItems.push(xvrToCompletionItem(xvr, range));
    });

    const calcs = metaInfoProvider.getCalcs();
    for (const calc of calcs) {
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
    contextProvider: SepticContext,
    doc: ITextDocument,
    settings: CompletionSettings = { onlySuggestValidSnippets: false }
): CompletionItem[] {
    cnfg.updateObjectParents(SepticMetaInfoProvider.getInstance().getObjectHierarchy());
    contextProvider.updateObjectParents(SepticMetaInfoProvider.getInstance().getObjectHierarchy());
    const snippets: CompletionItem[] = getRelevantSnippets(offset, contextProvider, doc, settings.onlySuggestValidSnippets);
    const references: CompletionItem[] = [];
    const obj = cnfg.findObjectFromLocation(offset);
    if (!obj) {
        return snippets;
    }
    const ref = cnfg.findReferenceFromLocation(offset);
    if (isIdentifierCompletion(offset, obj)) {
        const range: Range = ref
            ? {
                start: doc.positionAt(ref.location.start),
                end: doc.positionAt(ref.location.end),
            }
            : {
                start: doc.positionAt(offset),
                end: doc.positionAt(offset),
            };
        return getRelevantXvrsIdentifier(
            obj,
            contextProvider.getAllXvrObjects()
        ).map((obj) => xvrToCompletionItem(obj, range));
    }
    const currentAttr = getCurrentAttr(offset, obj);
    if (!currentAttr.attr) {
        return [...snippets, ...getObjectAttributeCompletion(obj, offset, doc)];
    }
    if (isReferenceAttribute(obj, currentAttr.attr)) {
        const range: Range = ref
            ? {
                start: doc.positionAt(ref.location.start),
                end: doc.positionAt(ref.location.end),
            }
            : {
                start: doc.positionAt(offset),
                end: doc.positionAt(offset),
            };

        references.push(
            ...getRelevantXvrsAttributes(
                currentAttr.attr,
                contextProvider.getAllXvrObjects()
            ).map((obj) => xvrToCompletionItem(obj, range))
        );
    }
    if (isEndAttribute(offset, currentAttr.attr)) {
        if (currentAttr.last) {
            return [
                ...getObjectAttributeCompletion(obj, offset, doc),
                ...references,
                ...snippets,
            ];
        }
        return [
            ...getObjectAttributeCompletion(obj, offset, doc),
            ...references,
        ];
    }
    return references;
}

function getCurrentAttr(
    offset: number,
    obj: SepticObject
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
    for (const attr of objDoc.attributes) {
        if (obj.getAttribute(attr.name)) {
            continue;
        }
        const text = rangeNewLine.addNewLine
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

function getRangeAttrTextEdit(
    offset: number,
    doc: ITextDocument
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
    const startChar = isOnlyTextOnLine ? 0 : pos.character - existing.str.length;
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

const priorityMapping: { [key: string]: number } = {
    "Mvr": 1,
    "Cvr": 2,
    "Dvr": 3,
    "Evr": 4,
    "Tvr": 5,
};

function xvrToCompletionItem(obj: SepticObject, range: Range): CompletionItem {
    let priority = priorityMapping[obj.type] ?? 6;
    return {
        label: obj.identifier!.name,
        labelDetails: { detail: ` ${obj.type}` },
        kind: CompletionItemKind.Variable,
        detail: obj.type,
        data: obj.identifier!.name,
        filterText: obj.identifier!.id + obj.identifier!.name,
        sortText: priority + obj.identifier!.id,
        textEdit: TextEdit.replace(range, obj.identifier!.name),
    };
}

function getRelevantXvrsCalc(objects: SepticObject[]) {
    return objects.filter((obj) => obj.isXvr);
}

function getRelevantXvrsIdentifier(
    obj: SepticObject,
    objects: SepticObject[]
): SepticObject[] {
    if (obj.isXvr) {
        return objects.filter((xvr) =>
            xvr.isType("Sopc" + obj.type, "UA" + obj.type)
        );
    } else if (obj.isOpcXvr) {
        return objects.filter((xvr) =>
            xvr.isType(obj.type.slice(obj.type.length - 3))
        );
    } else if (obj.isType("CalcPvr")) {
        return objects.filter((xvr) => xvr.isType("Evr"));
    } else {
        return objects.filter((xvr) => xvr.isXvr);
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
            return objects.filter((obj) => obj.isXvr);
    }
}

function getRelevantSnippets(offset: number, contextProvider: SepticContext, doc: ITextDocument, onlySuggestValidSnippets: boolean): CompletionItem[] {
    const snippets = SepticMetaInfoProvider.getInstance().getSnippets().slice();
    if (!onlySuggestValidSnippets) {
        return snippets;
    }
    const obj = contextProvider.findObjectFromLocation(offset, doc.uri);
    if (!obj) {
        return snippets.filter((snippet) => snippet.label.startsWith("system"));
    }
    const objectHierarchy = SepticMetaInfoProvider.getInstance().getObjectHierarchy();
    const relevantObjects = getObjectsSnippets(objectHierarchy, obj);
    return snippets.filter((snippet) => relevantObjects.includes(snippet.label));
}

function getObjectsSnippets(objectHierarchy: SepticObjectHierarchy, obj: SepticObject): string[] {
    let node = objectHierarchy.nodes.get(obj.type);
    let currentObject: SepticObject | undefined = obj;
    if (!node) {
        return [];
    }
    const relevantObjects: string[] = [];
    relevantObjects.push(...node.children);
    while (node) {
        let parentType = ""
        if (currentObject?.parent) {
            parentType = currentObject.parent.type;
        } else {
            parentType = node.parents.length ? node.parents[0] : "";
        }
        node = objectHierarchy.nodes.get(parentType);
        if (node) {
            relevantObjects.push(node.name);
            relevantObjects.push(...node.children)
        }
        currentObject = currentObject?.parent;
    }

    return relevantObjects.map((val) => val.toLowerCase());
}