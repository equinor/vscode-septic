/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AlgVisitor } from "./alg";
import { SepticTokenType } from "./tokens";
import {
    SepticMetaInfoProvider,
    SepticObjectHierarchy,
} from "../metaInfoProvider";
import {
    Attribute,
    AttributeValue,
    SepticComment,
    SepticObject,
} from "./elements";
import {
    SepticReference,
    RefValidationFunction,
    defaultRefValidationFunction,
    createSepticReference,
    ReferenceType,
} from "./reference";
import { SepticContext } from './context';
import { removeSpaces, sleep, transformPositionsToOriginal } from "../util";
import { updateParentObjects } from "./hierarchy";
import { getFunctionsFromCalcPvrs, SepticFunction } from './function';
import { ITextDocument } from '../types/textDocument';
import { CancellationToken, Position, Range } from 'vscode-languageserver';
import { SepticParser, SepticScanner } from './parser';

export class SepticCnfg implements SepticContext, ITextDocument {
    public objects: SepticObject[] = [];
    public comments: SepticComment[] = [];
    public readonly doc: ITextDocument;
    private references = new Map<string, SepticReference[]>();
    private referencesExtracted = false;

    constructor(doc: ITextDocument) {
        this.doc = doc;
    }

    public parse(cts: CancellationToken): void {
        const scanner = new SepticScanner(this.doc.getText());
        const tokens = scanner.scanTokens();
        if (!tokens.tokens.length) {
            return;
        }
        const parser = new SepticParser(tokens.tokens);

        this.objects = parser.parse(cts);
        this.comments = tokens.comments.map((comment) => {
            return new SepticComment(
                comment.content,
                comment.type,
                comment.start,
                comment.end
            );
        });
        this.objects.forEach((obj) => {
            obj.setUri(this.uri);
        });
    }

    public async parseAsync(token: CancellationToken): Promise<void> {
        const scanner = new SepticScanner(this.doc.getText());
        const tokens = scanner.scanTokens();
        if (!tokens.tokens.length) {
            return;
        }
        await sleep(1);  // Sleep to prevent starvation of other async tasks
        const parser = new SepticParser(tokens.tokens);
        this.objects = parser.parse(token);
        this.comments = tokens.comments.map((comment) => {
            return new SepticComment(
                comment.content,
                comment.type,
                comment.start,
                comment.end
            );
        });
        this.objects.forEach((obj) => {
            obj.setUri(this.uri);
        });
    }

    public positionAt(offset: number): Position {
        return this.doc.positionAt(offset);
    }

    public offsetAt(position: Position): number {
        return this.doc.offsetAt(position);
    }

    public getText(range?: Range): string {
        return this.doc.getText(range);
    }

    public get lineCount(): number {
        return this.doc.lineCount;
    }

    public get version(): number {
        return this.doc.version;
    }

    public async load(): Promise<void> {
        return Promise.resolve();
    }

    public get uri(): string {
        return this.doc.uri;
    }

    public getReferences(name: string): SepticReference[] | undefined {
        this.extractReferences();
        return this.references.get(removeSpaces(name));
    }

    public validateReferences(
        name: string,
        validationFunction: RefValidationFunction = defaultRefValidationFunction
    ): boolean {
        const xvrRefs = this.getReferences(name);
        if (!xvrRefs) {
            return false;
        }
        return validationFunction(xvrRefs);
    }

    public getAllXvrObjects(): SepticObject[] {
        return this.objects.filter((obj) => obj.isXvr || obj.isOpcXvr);
    }

    public getObjectsByType(...types: string[]): SepticObject[] {
        return this.objects.filter((obj) => obj.isType(...types));
    }

    public getObjectsByIdentifier(identifier: string): SepticObject[] {
        const identifierSpacesRemoved = removeSpaces(identifier);
        return this.objects.filter((obj) => {
            if (!obj.identifier) {
                return false;
            }
            return obj.identifier.id === identifierSpacesRemoved;
        });
    }

    public getObjectByIdentifierAndType(
        identifier: string,
        type: string
    ): SepticObject | undefined {
        const identifierSpacesRemoved = removeSpaces(identifier);
        return this.objects.find((val) => {
            if (!val.identifier) {
                return false;
            }
            return (
                removeSpaces(val.identifier.name) === identifierSpacesRemoved &&
                val.type === type
            );
        });
    }

    public findAlgValueFromLocation(location: Position | number): undefined | AttributeValue {
        const offset = typeof location === "number" ? location : this.offsetAt(location);
        const obj = this.findObjectFromLocation(offset);
        if (!obj) {
            return undefined;
        }
        const algValue = obj.getAttributeFirstValueObject("Alg");
        if (!algValue) {
            return undefined;
        }
        if (offset >= algValue.start && offset <= algValue.end) {
            return algValue;
        }
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public findObjectFromLocation(location: Position | number, uri: string = ""): SepticObject | undefined {
        if (!this.objects.length) {
            return undefined;
        }
        const offset = typeof location === "number" ? location : this.offsetAt(location)
        if (offset < this.objects[0].start) {
            return undefined;
        }
        let index = 1;
        while (index < this.objects.length) {
            if (this.objects[index].start >= offset) {
                return this.objects[index - 1];
            }
            index += 1;
        }
        return this.objects[this.objects.length - 1];
    }

    public getObjectsInRange(start: number, end: number): SepticObject[] {
        return this.objects.filter((obj) => {
            return obj.start >= start && obj.end <= end;
        });
    }

    public findReferenceFromLocation(location: Position | number): SepticReference | undefined {
        this.extractReferences();
        const offset = typeof location === "number" ? location : this.offsetAt(location)
        for (const xvrRef of this.references.values()) {
            const validRef = xvrRef.find((ref) => {
                return (
                    offset >= ref.location.start && offset <= ref.location.end
                );
            });
            if (validRef) {
                return validRef;
            }
        }
        return undefined;
    }

    public updateObjectParents(
    ): Promise<void> {
        updateParentObjects(this.objects);
        return Promise.resolve();
    }

    private extractReferences(): void {
        if (this.referencesExtracted) {
            return;
        }
        this.referencesExtracted = true;
        this.objects.forEach((obj) => {
            extractReferencesFromObj(obj).forEach((xvr) => {
                xvr.location.uri = this.uri;
                this.addXvrRef(xvr);
            });
        });
    }

    private addXvrRef(ref: SepticReference) {
        if (this.references.has(ref.identifier)) {
            this.references.get(ref.identifier)?.push(ref);
        } else {
            this.references.set(ref.identifier, [ref]);
        }
    }

    public getFunctions(): SepticFunction[] {
        const calcPvrs = this.objects.filter((obj) => obj.isType("CalcPvr"));
        const functions: SepticFunction[] = getFunctionsFromCalcPvrs(calcPvrs);
        return functions;
    }
}

export function extractReferencesFromObj(obj: SepticObject): SepticReference[] {
    const references: SepticReference[] = [];
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const objectDef = metaInfoProvider.getObject(obj.type);
    if (!objectDef) {
        return [];
    }

    if (objectDef.refs.identifier && obj.identifier) {
        const isObjRef = obj.isXvr || obj.isOpcXvr || obj.isType("CalcPvr");
        const ref: SepticReference = createSepticReference(
            obj.identifier.name,
            {
                uri: "",
                start: obj.identifier.start,
                end: obj.identifier.end,
            },
            isObjRef ? obj : undefined,
            isObjRef
                ? ReferenceType.xvr
                : ReferenceType.identifier
        );
        references.push(ref);
    }

    objectDef.refs.attributes.forEach((attr) => {
        references.push(...attributeReferences(obj, attr));
    });

    if (obj.isType("CalcPvr")) {
        references.push(...calcPvrReferences(obj));
    }
    return references;
}

function calcPvrReferences(obj: SepticObject): SepticReference[] {
    const refs: SepticReference[] = [];
    const parsedAlg = obj.parseAlg();
    if (!parsedAlg) {
        return [];
    }
    const visitor = new AlgVisitor();
    visitor.visit(parsedAlg.algExpr);

    visitor.variables.forEach((xvr) => {
        const identifier = xvr.value.split(".")[0];
        let start = xvr.start;
        const diff = xvr.end - xvr.start;
        if (parsedAlg.positionsMap.length) {
            const originalPositions = transformPositionsToOriginal([start], parsedAlg.positionsMap);
            start = originalPositions[0];
        }
        const ref: SepticReference = createSepticReference(
            identifier,
            {
                uri: "",
                start: obj.getAttributeFirstValueObject("Alg")!.start + start + 1,
                end: obj.getAttributeFirstValueObject("Alg")!.start + start + diff + 1,
            },
            undefined,
            ReferenceType.calc
        );
        refs.push(ref);
    });
    return refs;
}

function attributeReferences(obj: SepticObject, attrName: string): SepticReference[] {
    const attr = obj.getAttribute(attrName);
    if (!attr) {
        return [];
    }
    const sliceIndex = attr.values.length < 2 ? 0 : 1;
    const refs = attr.values.slice(sliceIndex).filter((val) => {
        return (
            val.type === SepticTokenType.string ||
            val.type === SepticTokenType.identifier
        );
    });
    return refs.map((ref) => {
        return createSepticReference(
            ref.getValue(),
            {
                uri: "",
                start:
                    ref.type === SepticTokenType.string
                        ? ref.start + 1
                        : ref.start,
                end:
                    ref.type === SepticTokenType.string ? ref.end - 1 : ref.end,
            },
            undefined,
            ReferenceType.attribute
        );
    });
}