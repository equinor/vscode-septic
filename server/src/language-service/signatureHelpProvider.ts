import {
    ParameterInformation,
    SignatureHelp,
    SignatureHelpParams,
} from "vscode-languageserver";
import { SepticConfigProvider } from "./septicConfigProvider";
import { ITextDocument } from "./types/textDocument";
import {
    AlgExpr,
    AlgFunction,
    AlgVisitor,
    SepticCalcInfo,
    SepticCalcParameterInfo,
    SepticMetaInfoProvider,
    formatCalcParameter,
    parseAlg,
} from "../septic";

export class SignatureHelpProvider {
    private cnfgProvider: SepticConfigProvider;

    constructor(cnfgProvider: SepticConfigProvider) {
        this.cnfgProvider = cnfgProvider;
    }
    public async provideSignatureHelp(
        param: SignatureHelpParams,
        doc: ITextDocument
    ): Promise<SignatureHelp> {
        let cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return { signatures: [] };
        }
        let offset = doc.offsetAt(param.position);
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
        let currentCalc: AlgFunction | undefined = undefined;
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
}

function paramMetaInfoToParameterInformation(
    paramInfo: SepticCalcParameterInfo
): ParameterInformation {
    return {
        label: paramInfo.name,
        documentation: formatCalcParameter(paramInfo),
    };
}

function getIndexParamCalc(calc: AlgFunction, offset: number) {
    let index = 0;
    for (let param of calc.args) {
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
            case "?":
                indexParam += 1;
                break;
            case "":
                indexParam += 1;
                break;
            default:
                indexParam += parseInt(param.arity);
                break;
        }
    }

    return -1;
}
