/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Hover,
    HoverParams,
    MarkupContent,
    MarkupKind,
    Position,
} from "vscode-languageserver";
import { SepticConfigProvider } from "../configProvider";
import {
    AlgVisitor,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticContext,
    formatCalcMarkdown,
    formatObjectAttribute,
    formatObjectDocumentationMarkdown,
    formatObjectInstance,
    parseAlg,
} from "septic";

export class HoverProvider {
    private cnfgProvider: SepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    async provideHover(
        params: HoverParams,
        contextProvider: SepticContext,
    ): Promise<Hover | undefined> {
        const cnfg = await this.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return undefined;
        }
        await contextProvider.load();
        return getHover(cnfg, params.position, contextProvider);
    }
}

export function getHover(
    cnfg: SepticCnfg,
    position: Position,
    contextProvider: SepticContext,
): Hover | undefined {
    const objectHover = getObjectHover(cnfg, position);
    if (objectHover) {
        return objectHover;
    }
    const refHover = getReferenceHover(cnfg, position, contextProvider);
    if (refHover) {
        return refHover;
    }
    return getCalcHover(cnfg, position);
}

export function getReferenceHover(
    cnfg: SepticCnfg,
    position: Position,
    contextProvider: SepticContext,
): Hover | undefined {
    const ref = cnfg.findReferenceFromLocation(position);
    if (!ref) {
        return undefined;
    }
    const allRefs = contextProvider.getReferences(ref.identifier);
    if (!allRefs) {
        return undefined;
    }
    const xvr = allRefs.filter((value) => {
        return value.obj?.isXvr;
    });
    if (xvr.length) {
        const text = formatObjectInstance(xvr[0].obj!);
        return {
            contents: { value: text, kind: "markdown" },
            range: {
                start: cnfg.positionAt(ref.location.start),
                end: cnfg.positionAt(ref.location.end),
            },
        };
    }
}

export function getObjectHover(
    cnfg: SepticCnfg,
    position: Position,
): Hover | undefined {
    const offset = cnfg.offsetAt(position);
    const obj = cnfg.findObjectFromLocation(offset);
    if (!obj) {
        return undefined;
    }
    const objDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        obj.type,
    );
    if (!objDoc) {
        return undefined;
    }
    if (offset <= obj.start + obj.type.length) {
        return {
            contents: {
                value: formatObjectDocumentationMarkdown(objDoc),
                kind: MarkupKind.Markdown,
            },
            range: {
                start: cnfg.positionAt(obj.start),
                end: cnfg.positionAt(obj.start + obj.type.length),
            },
        };
    }
    for (const attr of obj.attributes) {
        if (
            offset >= attr.start &&
            offset <= attr.start + attr.key.length + 1
        ) {
            const attrDoc = objDoc.attributes.find(
                (attrDoc) => attrDoc.name === attr.key,
            );
            if (!attrDoc) {
                return undefined;
            }
            return {
                contents: {
                    value: formatObjectAttribute(attrDoc, true),
                    kind: MarkupKind.Markdown,
                },
                range: {
                    start: cnfg.positionAt(attr.start),
                    end: cnfg.positionAt(attr.start + attr.key.length),
                },
            };
        }
    }
}

export function getCalcHover(
    cnfg: SepticCnfg,
    position: Position,
): Hover | undefined {
    const offset = cnfg.offsetAt(position);
    const obj = cnfg.findObjectFromLocation(offset);
    if (!obj) {
        return undefined;
    }
    if (obj.type !== "CalcPvr") {
        return undefined;
    }
    const algAttr = obj.getAttribute("Alg");
    if (!algAttr) {
        return undefined;
    }
    let alg;
    try {
        alg = parseAlg(
            algAttr.values[0].value.substring(
                1,
                algAttr.values[0].value.length - 1,
            ),
        );
    } catch {
        return undefined;
    }
    const visitor = new AlgVisitor();
    visitor.visit(alg);

    const startAlg = algAttr.values[0].start + 1;
    let currentCalc;
    for (const calc of visitor.calcs) {
        const startCalc = startAlg + calc.start;
        const endCalc = startAlg + calc.end;
        if (offset <= endCalc && offset >= startCalc) {
            currentCalc = calc;
        }
    }
    if (currentCalc) {
        const content = getCalcDocumentation(currentCalc.identifier);
        if (!content) {
            return undefined;
        }
        return {
            contents: content,
            range: {
                start: cnfg.positionAt(startAlg + currentCalc.start),
                end: cnfg.positionAt(startAlg + currentCalc.end),
            },
        };
    }
    return undefined;
}

function getCalcDocumentation(name: string): MarkupContent | undefined {
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const calcInfo = metaInfoProvider.getCalc(name);
    if (!calcInfo) {
        return undefined;
    }
    return {
        value: formatCalcMarkdown(calcInfo),
        kind: MarkupKind.Markdown,
    };
}
