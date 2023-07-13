/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CompletionItem,
    TextDocumentPositionParams,
    CompletionItemKind,
    Position,
    TextEdit,
    InsertTextMode,
    InsertTextFormat,
    Range,
} from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    SepticAttributeDocumentation,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticReferenceProvider,
    formatCalcMarkdown,
    formatObjectAttribute,
} from "../septic";
import { indentsAttributesDelimiter } from "./formatProvider";
import { isAlphaNumeric } from "../util";

export class CompletionProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideCompletion(
        pos: TextDocumentPositionParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<CompletionItem[]> {
        const offset = doc.offsetAt(pos.position);
        const cnfg = await this.cnfgProvider.get(pos.textDocument.uri);
        if (!cnfg) {
            return [];
        }
        await refProvider.load();
        return getCompletion(cnfg, offset, doc, refProvider);
    }
}

export function getCompletion(
    cnfg: SepticCnfg,
    offset: number,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): CompletionItem[] {
    if (cnfg.offsetInAlg(offset)) {
        return getCalcCompletion(offset, cnfg, refProvider);
    }
    return getObjectCompletion(offset, cnfg, refProvider, doc);
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
    const relevantXvrs = getRelevantXvrs(obj, refProvider.getAllXvrObjects());
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
                value: formatCalcMarkdown(calc, true),
                kind: "markdown",
            },
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
    const pos = doc.positionAt(obj.start);
    const line = doc.getText({
        start: Position.create(pos.line, 0),
        end: Position.create(pos.line, Infinity),
    });
    let existing = getExistingCompletion(
        line,
        doc.positionAt(offset).character - 1
    );
    if (!obj.identifier || existing.str === obj.identifier.name) {
        const offsetEndLine = doc.offsetAt(
            Position.create(pos.line, line.length)
        );
        const startName = obj.start + obj.type.length + 2;
        const endName = obj.attributes.length
            ? obj.attributes[0].start
            : offsetEndLine;
        if (offset > startName && offset < endName) {
            const relevantXvrs = getRelevantXvrs(
                obj,
                refProvider.getAllXvrObjects()
            );
            relevantXvrs.forEach((xvr) => {
                compItems.push(xvrToCompletionItem(xvr));
            });
            return compItems;
        }
    }

    for (let attr of obj.attributes) {
        if (offset > attr.start && offset < attr.end) {
            return [];
        }
    }
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objDoc = metaInfoProvider.getObjectDocumentation(obj.type);
    if (!objDoc) {
        return [];
    }
    let rangeNewLine = getRangeAttrTextEdit(offset, doc);
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

function getTextAttrTextEdit(attr: SepticAttributeDocumentation) {
    let hasDefault = attr.default.length > 0;
    let attrFormatted =
        " ".repeat(Math.max(indentsAttributesDelimiter - attr.name.length, 0)) +
        attr.name +
        "=" +
        "  ";
    attrFormatted += hasDefault ? "${1:" + attr.default + "}" : "${1}";
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

function getRelevantXvrs(
    curObj: SepticObject,
    xvrs: SepticObject[]
): SepticObject[] {
    if (curObj.isXvr()) {
        return xvrs.filter((xvr) => xvr.isType("Sopc" + curObj.type));
    } else if (curObj.isSopcXvr()) {
        return xvrs.filter((xvr) => xvr.isType(curObj.type.slice(4)));
    } else if (curObj.isType("CalcPvr")) {
        return xvrs.filter((xvr) => xvr.isXvr());
    } else {
        return [];
    }
}
