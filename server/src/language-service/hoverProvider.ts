import { Hover, HoverParams } from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import { SepticObject, SepticReferenceProvider } from "../septic";

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
        const ref = cnfg.getXvrRefFromOffset(doc.offsetAt(params.position));
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
    const attr = obj.getAttribute(attrId);
    if (!attr) {
        return "";
    }
    try {
        return attr.values[0].value.substring(
            1,
            attr.values[0].value.length - 1
        );
    } catch {
        return "";
    }
}
