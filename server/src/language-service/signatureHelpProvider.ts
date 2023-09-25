/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
    fromCalcIndexToParamIndex,
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
    let currentIndexCalc = getIndexParamCalc(currentCalc, offsetAlg);
    let activeParameterIndex = fromCalcIndexToParamIndex(
        currentCalc,
        calcMetaInfo,
        currentIndexCalc
    );
    return {
        signatures: [
            {
                label: calcMetaInfo.signature,
                parameters: calcMetaInfo.parameters.map((param) => {
                    return paramMetaInfoToParameterInformation(param);
                }),
                activeParameter: activeParameterIndex,
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
