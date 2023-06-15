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
} from "../septic";

const indentsObjectDeclaration = 2;
const indentsAttributesDelimiter = 14;
const startObjectName = 17;
const indentsToValueAttr = 2;
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

    constructor(cnfgProvider: ISepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

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

class SepticCnfgFormatter {
    private doc: ITextDocument;

    private lines: string[] = [];
    private currentLine = "";

    private start: number = 0;
    private edits: TextEdit[] = [];

    private elements: SepticBase[] = [];
    private iterElements: number = 0;

    private editAddedFlag = false;

    private attrValueCounter = 0;

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
        this.addEdit();
        return this.edits;
    }

    private formatObject(object: SepticObject) {
        let editedFlag = this.getEditedFlag();
        let existingWhitespaces = 0;
        if (editedFlag) {
            let pos = this.doc.positionAt(this.start);
            let currentLineText = this.doc.getText({
                start: Position.create(pos.line, 0),
                end: pos,
            });
            let onlyWhitespaces = currentLineText.trim().length === 0;
            if (onlyWhitespaces) {
                existingWhitespaces = currentLineText.length;
                if (existingWhitespaces >= indentsObjectDeclaration) {
                    this.start -=
                        existingWhitespaces - indentsObjectDeclaration;
                    existingWhitespaces = indentsObjectDeclaration;
                }
            }
            if (!onlyWhitespaces) {
                this.addEmptyLine();
            }
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
        this.addLine();
        let editedFlag = this.getEditedFlag();
        let existingWhitespaces = 0;
        if (editedFlag) {
            let pos = this.doc.positionAt(this.start);
            let lineText = this.doc.getText({
                start: Position.create(pos.line, 0),
                end: pos,
            });
            let onlyWhitespaces = lineText.trim().length === 0;
            if (onlyWhitespaces) {
                existingWhitespaces = lineText.length;
                if (existingWhitespaces >= indentsAttributesDelimiter) {
                    this.start -=
                        existingWhitespaces - indentsAttributesDelimiter;
                    existingWhitespaces = indentsAttributesDelimiter;
                }
            } else {
                this.addEmptyLine();
            }
        }
        let indentsStart = Math.max(
            indentsAttributesDelimiter - attr.key.length - existingWhitespaces,
            0
        );
        let attrDefFormatted =
            " ".repeat(indentsStart) +
            attr.key +
            "=" +
            " ".repeat(indentsToValueAttr - 1);
        this.currentLine += attrDefFormatted;
        this.attrValueCounter = 0;
    }

    private formatAttrValue(attrValue: AttributeValue) {
        let editedFlag = this.getEditedFlag();
        if (!editedFlag) {
            if (this.attrValueCounter >= maxNumberAttrValuesPerLine) {
                this.addLine();
                this.attrValueCounter = 0;
            }
            let spaces = !this.currentLine.length
                ? indentsAttributeValuesStart
                : 1;
            this.currentLine += " ".repeat(spaces) + attrValue.value;
            this.attrValueCounter += 1;
            return;
        }

        let pos = this.doc.positionAt(this.start);
        let lineText = this.doc.getText({
            start: Position.create(pos.line, 0),
            end: pos,
        });
        let onlyWhitespaces = lineText.trim().length === 0;
        if (!onlyWhitespaces) {
            let spaces = /\s$/.test(lineText) ? 0 : 1;
            this.currentLine += " ".repeat(spaces) + attrValue.value;
            return;
        }
        let existingWhitespaces = lineText.length;
        if (existingWhitespaces >= indentsAttributeValuesStart) {
            this.start -= existingWhitespaces - indentsAttributeValuesStart;
            existingWhitespaces = indentsAttributeValuesStart;
        }
        this.currentLine +=
            " ".repeat(indentsAttributeValuesStart - existingWhitespaces) +
            attrValue.value;
        this.attrValueCounter += 1;
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
        let nextElement = this.peek();
        if (!nextElement) {
            this.start = this.elements[this.elements.length - 1].end;
            return;
        }
        this.start = comment.end;
        return;
    }

    private formatJinjaExpression(comment: SepticComment) {
        if (jinjaForRegex.test(comment.content)) {
            this.addEdit();
            if (!this.synchronize(this.syncJinjaFor)) {
                return;
            }
            let nextElement = this.previous();
            if (!nextElement) {
                this.start = this.elements[this.elements.length - 1].end;
                return;
            }
            this.start = nextElement.end;
            return;
        }

        if (jinjaIfRegex.test(comment.content)) {
            this.addEdit();
            if (!this.synchronize(this.syncJinjaIf)) {
                return;
            }
            let nextElement = this.previous();
            if (!nextElement) {
                this.start = this.elements[this.elements.length - 1].end;
                return;
            }
            this.start = nextElement.end;
            return;
        }
        this.formatSepticComment(comment);
    }

    private formatJinjaComment(comment: SepticComment) {
        if (stopFormattingRegex.test(comment.content)) {
            this.addEdit();
            if (!this.synchronize(this.syncStartFormatting)) {
                return;
            }
            let nextElement = this.previous();
            if (!nextElement) {
                this.start = this.elements[this.elements.length - 1].end;
                return;
            }
            this.start = nextElement.end;
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
        if (undefined) {
            return false;
        }
        let isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaForEndRegex.test((element as SepticComment).content);
    }

    private syncJinjaIf(element: SepticBase | undefined) {
        if (undefined) {
            return false;
        }
        let isComment = element instanceof SepticComment;
        if (!isComment) {
            return false;
        }
        return jinjaIfEndRegex.test((element as SepticComment).content);
    }

    private syncStartFormatting(element: SepticBase | undefined) {
        if (undefined) {
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
        this.attrValueCounter = 0;
        return;
    }

    private previous(): SepticBase {
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
        if (this.iterElements >= this.elements.length - 1) {
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

    private getEditedFlag() {
        if (this.editAddedFlag) {
            this.editAddedFlag = false;
            return true;
        }
        return false;
    }

    private setEditedFlag() {
        this.editAddedFlag = true;
    }
}
