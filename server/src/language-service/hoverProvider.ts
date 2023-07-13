import {
    Hover,
    HoverParams,
    MarkupContent,
    MarkupKind,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgVisitor,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticReferenceProvider,
    formatCalcMarkdown,
    formatObjectAttribute,
    formatObjectDocumentationMarkdown,
    parseAlg,
} from "../septic";

export class HoverProvider {
    private cnfgProvider: SepticConfigProvider;

    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    async provideHover(
        params: HoverParams,
        doc: ITextDocument,
        refProvider: SepticReferenceProvider
    ): Promise<Hover | undefined> {
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return undefined;
        }
        await refProvider.load();
        const offset = doc.offsetAt(params.position);
        return getHover(cnfg, offset, doc, refProvider);
    }
}

export function getHover(
    cnfg: SepticCnfg,
    offset: number,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Hover | undefined {
    let objectHover = getObjectHover(cnfg, offset, doc);
    if (objectHover) {
        return objectHover;
    }
    let refHover = getReferenceHover(cnfg, offset, doc, refProvider);
    if (refHover) {
        return refHover;
    }
    return getCalcHover(cnfg, offset, doc);
}

export function getReferenceHover(
    cnfg: SepticCnfg,
    offset: number,
    doc: ITextDocument,
    refProvider: SepticReferenceProvider
): Hover | undefined {
    const ref = cnfg.getXvrRefFromOffset(offset);
    if (!ref) {
        return undefined;
    }
    const allRefs = refProvider.getXvrRefs(ref.identifier);
    if (!allRefs) {
        return undefined;
    }
    const xvr = allRefs.filter((value) => {
        return value.obj?.isXvr();
    });
    const sopcXvr = allRefs.filter((value) => {
        return value.obj?.isSopcXvr();
    });

    if (xvr.length) {
        let text = getMarkdownXvr(xvr[0].obj!);
        return {
            contents: text,
            range: {
                start: doc.positionAt(ref.location.start),
                end: doc.positionAt(ref.location.end),
            },
        };
    }

    if (sopcXvr.length) {
        let text = getMarkdownXvr(sopcXvr[0].obj!);
        return {
            contents: text,
            range: {
                start: doc.positionAt(ref.location.start),
                end: doc.positionAt(ref.location.end),
            },
        };
    }
}

export function getObjectHover(
    cnfg: SepticCnfg,
    offset: number,
    doc: ITextDocument
): Hover | undefined {
    const obj = cnfg.getObjectFromOffset(offset);
    const objDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        obj.type
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
                start: doc.positionAt(obj.start),
                end: doc.positionAt(obj.start + obj.type.length),
            },
        };
    }
    for (let attr of obj.attributes) {
        if (
            offset >= attr.start &&
            offset <= attr.start + attr.key.length + 1
        ) {
            let attrDoc = objDoc.attributes.find(
                (attrDoc) => attrDoc.name === attr.key
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
                    start: doc.positionAt(attr.start),
                    end: doc.positionAt(attr.start + attr.key.length),
                },
            };
        }
    }
}

export function getCalcHover(
    cnfg: SepticCnfg,
    offset: number,
    doc: ITextDocument
): Hover | undefined {
    const obj = cnfg.getObjectFromOffset(offset);
    if (obj.type !== "CalcPvr") {
        return undefined;
    }
    let algAttr = obj.getAttribute("Alg");
    if (!algAttr) {
        return undefined;
    }
    let alg;
    try {
        alg = parseAlg(
            algAttr.values[0].value.substring(
                1,
                algAttr.values[0].value.length - 1
            )
        );
    } catch {
        return undefined;
    }
    const visitor = new AlgVisitor();
    visitor.visit(alg);

    let startAlg = algAttr.values[0].start + 1;
    let currentCalc;
    for (let calc of visitor.calcs) {
        let startCalc = startAlg + calc.start;
        let endCalc = startAlg + calc.end;
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
                start: doc.positionAt(startAlg + currentCalc.start),
                end: doc.positionAt(startAlg + currentCalc.end),
            },
        };
    }
    return undefined;
}

function getCalcDocumentation(name: string): MarkupContent | undefined {
    let metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let calcInfo = metaInfoProvider.getCalc(name);
    if (!calcInfo) {
        return undefined;
    }
    return {
        value: formatCalcMarkdown(calcInfo),
        kind: MarkupKind.Markdown,
    };
}

function getMarkdownXvr(obj: SepticObject): MarkupContent {
    let text1 = obj.getAttribute("Text1")?.getValue() ?? "";
    let text2 = obj.getAttribute("Text2")?.getValue() ?? "";
    let text = `${obj.type}: ${obj.identifier?.name}`;
    if (text1 !== "") {
        text += `\n\nText1= ${text1}`;
    }
    if (text2 !== "") {
        text += `\n\nText2= ${text2}`;
    }
    return { value: text, kind: "markdown" };
}
