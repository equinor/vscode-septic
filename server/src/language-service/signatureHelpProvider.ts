import {
    ParameterInformation,
    SignatureHelp,
    SignatureHelpParams,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgExpr,
    AlgCalc,
    AlgVisitor,
    SepticCalcInfo,
    SepticCalcParameterInfo,
    SepticMetaInfoProvider,
    formatCalcParameter,
    parseAlg,
    SepticCnfg,
} from "../septic";

export class SignatureHelpProvider {
    private cnfgProvider: SepticConfigProvider;

    /* istanbul ignore next */
    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }

    /* istanbul ignore next */
    public async provideSignatureHelp(
        param: SignatureHelpParams,
        doc: ITextDocument
    ): Promise<SignatureHelp> {
        let cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return { signatures: [] };
        }
        let offset = doc.offsetAt(param.position);
        return getSignatureHelp(cnfg, offset);
    }
}

export function getSignatureHelp(
    cnfg: SepticCnfg,
    offset: number
): SignatureHelp {
    let alg = cnfg.getAlgFromOffset(offset);
    if (!alg) {
        return { signatures: [] };
    }
    let parsedAlg: AlgExpr;
    try {
        parsedAlg = parseAlg(alg.getValue()!);
    } catch {
        return { signatures: [] };
    }
    let algVisitor = new AlgVisitor();
    algVisitor.visit(parsedAlg);
    let offsetAlg = offset - (alg.getAttrValue()!.start + 1);
    let currentCalc: AlgCalc | undefined = undefined;
    for (let calc of algVisitor.calcs) {
        let start = calc.start + calc.identifier.length + 1;
        if (offsetAlg >= start && offsetAlg <= calc.end) {
            currentCalc = calc;
        }
    }
    if (!currentCalc) {
        return { signatures: [] };
    }
    let metaInfoProvider = SepticMetaInfoProvider.getInstance();
    let calcMetaInfo = metaInfoProvider.getCalc(currentCalc.identifier);
    if (!calcMetaInfo) {
        return { signatures: [] };
    }
    let paramMetaInfoIndex = indexToParamIndexDocumentation(
        calcMetaInfo,
        getIndexParamCalc(currentCalc, offsetAlg)
    );
    return {
        signatures: [
            {
                label: calcMetaInfo.signature,
                parameters: calcMetaInfo.parameters.map((param) => {
                    return paramMetaInfoToParameterInformation(param);
                }),
                activeParameter: paramMetaInfoIndex,
            },
        ],
    };
}

function paramMetaInfoToParameterInformation(
    paramInfo: SepticCalcParameterInfo
): ParameterInformation {
    return {
        label: paramInfo.name,
        documentation: {
            value: formatCalcParameter(paramInfo),
            kind: "markdown",
        },
    };
}

function getIndexParamCalc(calc: AlgCalc, offset: number) {
    let index = 0;
    for (let param of calc.params) {
        if (param.end < offset) {
            index += 1;
        } else {
            return index;
        }
    }
    return index;
}

function indexToParamIndexDocumentation(
    calc: SepticCalcInfo,
    index: number
): number {
    let indexParam = 0;
    for (let param of calc.parameters) {
        if (indexParam >= index) {
            return indexParam;
        }
        switch (param.arity) {
            case "even":
                return indexParam;
            case "odd":
                return indexParam;
            case "+":
                return indexParam;
            case "optional":
                indexParam += 1;
                break;
            default:
                indexParam += parseInt(param.arity);
                break;
        }
    }

    return indexParam - 1;
}
