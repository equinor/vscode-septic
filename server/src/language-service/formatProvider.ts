/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Position, TextEdit } from "vscode-languageserver";
import { ISepticConfigProvider } from "../configProvider";
import { ITextDocument } from "./types/textDocument";
import {
    Attribute,
    AttributeValue,
    Identifier,
    SepticBase,
    SepticCnfg,
    SepticComment,
    SepticObject,
    SepticTokenType,
    ValueTypes,
} from "../septic";

const indentsObjectDeclaration = 2;
export const indentsAttributesDelimiter = 14;
const startObjectName = 17;
const spacesBetweenValues = 2;
const spacesBetweenIntValues = 6;
const indentsAttributeValuesStart = 17;
const maxNumberAttrValuesPerLine = 5;

export const jinjaForRegex = /^\{%-?\s+for\b.+%}$/;
export const jinjaIfRegex = /^\{%-?\s+if\b.+%}$/;
export const jinjaForEndRegex = /\{%-?\s+endfor\s+%}$/;
export const jinjaIfEndRegex = /\{%-?\s+endif\s+%}$/;
export const jinjaExpressionRegex = /\{%[\S\s]*%\}/;
export const stopFormattingRegex = /^\{#\s+format:off\s+#}$/;
export const startFormattingRegex = /^\{#\s+format:on\s+#}$/;
export const lineCommentRegex = /\/\/\s|\*\/\s*$|#}\s*$|%}\s*$/;

export class FormattingProvider {
    private readonly cnfgProvider: ISepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideFormatting(doc: ITextDocument): Promise<TextEdit[]> {
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return [];
        }
        const formatter = new SepticCnfgFormatter(cnfg, doc);
        return formatter.format();
    }
}

type FormatterCheck = (element: SepticBase | undefined) => boolean;

export class SepticCnfgFormatter {
    private doc: ITextDocument;

    private lines: string[] = [];
    private currentLine = "";

    private start: number = 0;
    private edits: TextEdit[] = [];

    private elements: SepticBase[] = [];
    private iterElements: number = 0;

    private editAddedFlag = false;

    private object: SepticObject | undefined;

    private attr: Attribute | undefined;

    private attrValueState: AttrValueFormattingState = {
        type: ValueTypes.default,
        first: false,
        second: true,
        counter: 0,
    };

    constructor(cnfg: SepticCnfg, doc: ITextDocument) {
        cnfg.objects.forEach((obj) => {
            this.elements.push(...obj.getElements());
        });
        cnfg.comments.forEach((com) => {
            this.elements.push(...com.getElements());
        });
        this.elements = this.elements.sort((e1, e2) => {
            return e1.start - e2.start;
        });
        this.doc = doc;
    }

    public format(): TextEdit[] {
        this.advance();
        while (!this.isAtEnd()) {
            const element = this.previous();
            if (element instanceof SepticObject) {
                this.formatObject(element);
            } else if (element instanceof Attribute) {
                this.formatAttribute(element);
            } else if (element instanceof AttributeValue) {
                this.formatAttrValue(element);
            } else if (element instanceof SepticComment) {
                this.formatComment(element);
            }
            this.advance();
        }
        this.addEmptyLineEndOfFile();
        this.addEdit();
        return this.edits;
    }

    private formatObject(object: SepticObject) {
        this.setCurrentObject(object);
        const editedFlag = this.getEditedFlag();
        const existingWhitespaces = 0;
        if (editedFlag) {
            this.addEmptyLine();
            const pos = this.doc.positionAt(this.start);
            const currentLineText = this.doc.getText({
                start: Position.create(pos.line, 0),
                end: pos,
            });
            if (lineCommentRegex.test(currentLineText)) {
                const prevLineText = this.doc.getText({
                    start: Position.create(pos.line - 1, 0),
                    end: Position.create(pos.line - 1, 999),
                });
                if (!(prevLineText.trim().length === 0 || pos.line - 1 < 0)) {
                    this.addEmptyLine();
                }
            }
        } else {
            if (this.currentLine.length) {
                this.addLine();
            }
        }
        if (!this.isPreviousLineEmptyOrComment()) {
            this.addEmptyLine();
        }
        const indentsDeclaration = indentsObjectDeclaration - existingWhitespaces;
        const objectTypeFormatted =
            " ".repeat(indentsDeclaration) + object?.type + ":";
        this.currentLine += objectTypeFormatted;

        const indentsName = Math.max(
            startObjectName - objectTypeFormatted.length - existingWhitespaces,
            2
        );

        if (
            !this.synchronize((elem) => {
                return elem instanceof Identifier;
            })
        ) {
            return;
        }
        const identifier = this.previous() as Identifier;
        this.currentLine += " ".repeat(indentsName) + identifier.name;
    }

    private formatAttribute(attr: Attribute) {
        this.setCurrentAttribute(attr);
        this.addLine();
        const editedFlag = this.getEditedFlag();
        const existingWhitespaces = 0;
        if (editedFlag) {
            this.addEmptyLine();
        }
        const indentsStart = Math.max(
            indentsAttributesDelimiter - attr.key.length - existingWhitespaces,
            0
        );
        const attrDefFormatted = " ".repeat(indentsStart) + attr.key + "=";
        this.currentLine += attrDefFormatted;
        this.setAttrValueFormattingState(attr);
    }

    private formatAttrValue(attrValue: AttributeValue) {
        const editedFlag = this.getEditedFlag();
        let resetDoToEdit = false;
        if (editedFlag) {
            const pos = this.doc.positionAt(this.start);
            const lineText = this.doc.getText({
                start: Position.create(pos.line, 0),
                end: pos,
            });
            if (/\/\/ /.test(lineText)) {
                this.addEmptyLine();
                this.resetAttrValueCounter();
                this.attrValueState.first = false;
                this.attrValueState.second = false;
            } else {
                if (
                    this.attrValueState.type === ValueTypes.stringList &&
                    this.attrValueState.second
                ) {
                    this.addEmptyLine();
                } else {
                    resetDoToEdit = true;
                }
            }
        }
        if (this.attrValueState.first) {
            this.currentLine +=
                " ".repeat(
                    indentsAttributeValuesStart -
                    (indentsAttributesDelimiter + 1)
                ) + attrValue.value;
            this.attrValueState.first = false;
            if (this.attrValueState.type === ValueTypes.stringList) {
                this.addLine();
            }
            return;
        }

        if (
            this.attrValueState.counter >= this.getMaxNumberOfAttrValuesLine()
        ) {
            this.addLine();
            this.resetAttrValueCounter();
        }
        let spaces = !this.currentLine.length
            ? indentsAttributeValuesStart
            : spacesBetweenValues;
        if (resetDoToEdit) {
            spaces = 1;
        }
        if (
            this.attrValueState.type === ValueTypes.numericList &&
            spaces === spacesBetweenValues
        ) {
            spaces = Math.max(
                1,
                spacesBetweenIntValues - attrValue.value.length
            );
            if (this.attrValueState.second) {
                this.attrValueState.second = false;
                spaces = Math.max(1, spaces - 1);
            }
        }
        if (this.attrValueState.type === ValueTypes.stringList) {
            this.attrValueState.second = false;
        }
        this.currentLine += " ".repeat(spaces) + attrValue.value;
        this.incrementAttrValueCounter();
    }

    private formatComment(comment: SepticComment) {
        switch (comment.type) {
            case SepticTokenType.jinjaExpression:
                this.formatJinjaExpression(comment);
                break;
            case SepticTokenType.jinjaComment:
                this.formatJinjaComment(comment);
                break;
            default:
                this.formatSepticComment(comment);
                break;
        }
    }

    private formatSepticComment(comment: SepticComment) {
        this.addEdit();
        this.start = comment.end;
        return;
    }

    private formatJinjaExpression(comment: SepticComment) {
        if (jinjaForRegex.test(comment.content)) {
            this.addEdit();
            this.synchronize(this.syncJinjaFor);
            this.start = this.previous().end;
            return;
        }

        if (jinjaIfRegex.test(comment.content)) {
            this.addEdit();
            this.synchronize(this.syncJinjaIf);
            this.start = this.previous().end;
            return;
        }
        this.formatSepticComment(comment);
    }

    private formatJinjaComment(comment: SepticComment) {
        if (stopFormattingRegex.test(comment.content)) {
            this.addEdit();
            this.synchronize(this.syncStartFormatting);
            this.start = this.previous().end;
            return;
        }

        this.formatSepticComment(comment);
    }

    private isPreviousLineEmptyOrComment() {
        if (!this.lines.length) {
            return true;
        }
        const lastLine = this.lines[this.lines.length - 1];
        const isComment = lineCommentRegex.test(lastLine);
        return !lastLine.length || isComment;
    }

    private syncJinjaFor(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        const isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaForEndRegex.test((element as SepticComment).content);
    }

    private syncJinjaIf(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        const isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaIfEndRegex.test((element as SepticComment).content);
    }

    private syncStartFormatting(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        const isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return startFormattingRegex.test((element as SepticComment).content);
    }

    private addEmptyLine() {
        this.lines.push("");
    }

    private addLine() {
        if (!this.currentLine.length) {
            return;
        }
        this.lines.push(this.currentLine);
        this.currentLine = "";
    }

    private addEdit() {
        if (!this.lines.length && !this.currentLine.length) {
            this.setEditedFlag();
            return;
        }
        const previousElement = this.previousPrevious();
        let endPos;
        if (!previousElement || this.isAtEnd()) {
            endPos = Position.create(this.doc.lineCount, 99);
        } else {
            const currentElement = this.previous();
            if (previousElement.end > currentElement.end) {
                endPos = this.doc.positionAt(currentElement.start);
            } else {
                endPos = this.doc.positionAt(previousElement.end);
            }
        }
        if (previousElement instanceof Attribute) {
            this.currentLine += "  ";
        }
        this.addLine();
        const edit = TextEdit.replace(
            {
                start: this.doc.positionAt(this.start),
                end: endPos,
            },
            this.lines.join("\n")
        );
        this.lines = [];
        this.edits.push(edit);
        this.setEditedFlag();
        return;
    }

    private previous(): SepticBase {
        if (this.isAtEnd()) {
            return this.elements[this.elements.length - 1];
        }
        return this.elements[this.iterElements - 1];
    }

    private previousPrevious(): SepticBase | undefined {
        if (this.iterElements - 2 < 0) {
            return undefined;
        }
        return this.elements[this.iterElements - 2];
    }

    private check(callback: FormatterCheck): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        return callback(this.peek());
    }

    private peek(): SepticBase | undefined {
        if (this.iterElements >= this.elements.length) {
            return undefined;
        }
        return this.elements[this.iterElements];
    }

    private advance() {
        if (!this.isAtEnd()) {
            this.iterElements += 1;
        }
    }

    private isAtEnd() {
        return this.iterElements > this.elements.length;
    }

    private synchronize(callback: FormatterCheck): boolean {
        while (!this.isAtEnd()) {
            if (this.check(callback)) {
                this.advance();
                return true;
            }
            this.advance();
        }
        return false;
    }

    private getEditedFlag(): boolean {
        if (this.editAddedFlag) {
            this.editAddedFlag = false;
            return true;
        }
        return false;
    }

    private setEditedFlag(): void {
        this.editAddedFlag = true;
    }

    private addEmptyLineEndOfFile(): void {
        this.addLine();
        const edited = this.getEditedFlag();
        if (!edited) {
            const prevLine = this.lines[this.lines.length - 1];
            if (prevLine.length) {
                this.addEmptyLine();
            }
            return;
        }

        const pos = this.doc.positionAt(this.start);
        const lineText = this.doc.getText({
            start: Position.create(pos.line, 0),
            end: pos,
        });

        if (lineText.length) {
            this.lines.push("\n");
        }
    }

    private incrementAttrValueCounter(): void {
        if (this.attrValueState.type === ValueTypes.stringList) {
            this.attrValueState.counter += 1;
        }
    }

    private resetAttrValueCounter() {
        this.attrValueState.counter = 0;
    }

    private setAttrValueFormattingState(attr: Attribute) {
        const type = attr.getType();
        if (!type) {
            this.attrValueState = {
                type: ValueTypes.default,
                first: true,
                second: true,
                counter: 0,
            };
            return;
        }
        this.attrValueState = {
            type: type,
            first: true,
            second: true,
            counter: 0,
        };
    }

    private setCurrentObject(object: SepticObject) {
        this.object = object;
    }

    private setCurrentAttribute(attr: Attribute) {
        this.attr = attr;
    }

    private getMaxNumberOfAttrValuesLine() {
        if (!this.object?.isType("XvrMatrix") || !this.attr?.isKey("Xvrs")) {
            return maxNumberAttrValuesPerLine;
        }

        const cols = this.object!.getAttribute("ColIds");
        if (!cols) {
            return maxNumberAttrValuesPerLine;
        }
        const numCols = cols.getValue();
        if (!numCols) {
            return maxNumberAttrValuesPerLine;
        }
        const numColsInt = parseInt(numCols);
        if (isNaN(numColsInt)) {
            return maxNumberAttrValuesPerLine;
        }
        return numColsInt;
    }
}

interface AttrValueFormattingState {
    type: ValueTypes;
    first: boolean;
    second: boolean;
    counter: number;
}
