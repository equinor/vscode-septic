import { Position, TextEdit } from "vscode-languageserver";
import { ISepticConfigProvider } from "./septicConfigProvider";
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
export const stopFormattingRegex = /^\{#\s+format:off\s+#}$/;
export const startFormattingRegex = /^\{#\s+format:on\s+#}$/;
export const lineCommentRegex = /^\s*\/\/\s|\*\/\s*$|#}\s*$/;

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
            let element = this.previous();
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
        let editedFlag = this.getEditedFlag();
        let existingWhitespaces = 0;
        if (editedFlag) {
            this.addEmptyLine();
            let pos = this.doc.positionAt(this.start);
            let currentLineText = this.doc.getText({
                start: Position.create(pos.line, 0),
                end: pos,
            });
            if (!lineCommentRegex.test(currentLineText)) {
                this.addEmptyLine();
            }
        } else {
            if (this.currentLine.length) {
                this.addLine();
            }
            if (!this.isPreviousLineEmptyOrComment()) {
                this.addEmptyLine();
            }
        }
        let indentsDeclaration = indentsObjectDeclaration - existingWhitespaces;
        let objectTypeFormatted =
            " ".repeat(indentsDeclaration) + object?.type + ":";
        this.currentLine += objectTypeFormatted;

        let indentsName = Math.max(
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
        let identifier = this.previous() as Identifier;
        this.currentLine += " ".repeat(indentsName) + identifier.name;
    }

    private formatAttribute(attr: Attribute) {
        this.setCurrentAttribute(attr);
        this.addLine();
        let editedFlag = this.getEditedFlag();
        let existingWhitespaces = 0;
        if (editedFlag) {
            this.addEmptyLine();
        }
        let indentsStart = Math.max(
            indentsAttributesDelimiter - attr.key.length - existingWhitespaces,
            0
        );
        let attrDefFormatted = " ".repeat(indentsStart) + attr.key + "=";
        this.currentLine += attrDefFormatted;
        this.setAttrValueFormattingState(attr);
    }

    private formatAttrValue(attrValue: AttributeValue) {
        let editedFlag = this.getEditedFlag();
        let resetDoToEdit = false;
        if (editedFlag) {
            let pos = this.doc.positionAt(this.start);
            let lineText = this.doc.getText({
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
        let lastLine = this.lines[this.lines.length - 1];
        let isComment = lineCommentRegex.test(lastLine);
        return !lastLine.length || isComment;
    }

    private syncJinjaFor(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        let isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaForEndRegex.test((element as SepticComment).content);
    }

    private syncJinjaIf(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        let isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaIfEndRegex.test((element as SepticComment).content);
    }

    private syncStartFormatting(element: SepticBase | undefined) {
        if (!element) {
            return false;
        }
        let isComment = element instanceof SepticComment;
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
        let element = this.previousPrevious();
        let endPos;
        if (!element || this.isAtEnd()) {
            endPos = Position.create(this.doc.lineCount, 99);
        } else {
            endPos = this.doc.positionAt(element.end);
        }
        this.addLine();
        let edit = TextEdit.replace(
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

        let pos = this.doc.positionAt(this.start);
        let lineText = this.doc.getText({
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

        let cols = this.object!.getAttribute("ColIds");
        if (!cols) {
            return maxNumberAttrValuesPerLine;
        }
        let numCols = cols.getValue();
        if (!numCols) {
            return maxNumberAttrValuesPerLine;
        }
        let numColsInt = parseInt(numCols);
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
