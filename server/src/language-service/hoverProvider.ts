import { Hover, HoverParams, MarkupKind } from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgParser,
    AlgVisitor,
    SepticCalcInfo,
    SepticCalcParameterInfo,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
    SepticReferenceProvider,
    defaultObjectSymbolKind,
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
        const offset = doc.offsetAt(params.position);
        let calcHover = getCalcHover(cnfg, offset, doc);
        if (calcHover) {
            return calcHover;
        }
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
            let text = getTextXvr(xvr[0].obj!);
            return {
                contents: text,
                range: {
                    start: doc.positionAt(ref.location.start),
                    end: doc.positionAt(ref.location.end),
                },
            };
        }

        if (sopcXvr.length) {
            let text = getTextXvr(sopcXvr[0].obj!);
            return {
                contents: text,
                range: {
                    start: doc.positionAt(ref.location.start),
                    end: doc.positionAt(ref.location.end),
                },
            };
        }

        return undefined;
    }
}

function getCalcHover(cnfg: SepticCnfg, offset: number, doc: ITextDocument) {
    const obj = cnfg.getObjectFromOffset(offset);
    if (!obj) {
        return undefined;
    }
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
    for (let calc of visitor.calcs) {
        let startCalc = startAlg + calc.start;
        let endCalc = startAlg + calc.end;
        if (offset <= endCalc && offset >= startCalc) {
            return getCalc(calc.identifier, startCalc, endCalc, doc);
        }
    }
    return undefined;
}

function getCalc(
    name: string,
    start: number,
    end: number,
    doc: ITextDocument
): Hover | undefined {
    let metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let calcInfo = metaInfoProvider.getCalc(name);
    if (!calcInfo) {
        return undefined;
    }
    return {
        contents: {
            value: formatCalcDocumentation(calcInfo),
            kind: MarkupKind.Markdown,
        },
        range: {
            start: doc.positionAt(start),
            end: doc.positionAt(end),
        },
    };
}

function formatCalcDocumentation(calcInfo: SepticCalcInfo) {
    let formattedParameters = calcInfo.parameters.map((param) => {
        return formatCalcParameter(param);
    });
    let markdown = [
        `*${calcInfo.signature}*`,
        `${calcInfo.briefDescription}`,
        ...formattedParameters,
        `*@return* - ${calcInfo.retr}`,
    ];

    return markdown.join("\n\n");
}

function formatCalcParameter(param: SepticCalcParameterInfo) {
    let formattedParam = `*@param[${param.direction}]: ${param.name}* - ${param.description}`;
    if (param.type.length) {
        formattedParam += ` - (${param.type})`;
    }
    if (param.arity.length) {
        formattedParam += ` - ${param.arity}`;
    }
    return formattedParam;
}

function getTextXvr(obj: SepticObject) {
    let text1 = getTextAttr("Text1", obj);
    let text2 = getTextAttr("Text2", obj);
    let text = `${obj.type}: ${obj.identifier?.name}`;
    if (text1 !== "") {
        text += `\n\nText1= ${text1}`;
    }
    if (text2 !== "") {
        text += `\n\nText2= ${text2}`;
    }
    return text;
}

function getTextAttr(attrId: string, obj: SepticObject) {
    const attrValue = obj.getAttribute(attrId)?.getValue();
    return attrValue ?? "";
}
