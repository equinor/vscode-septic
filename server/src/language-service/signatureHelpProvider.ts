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
        const cnfg = await this.cnfgProvider.get(doc.uri);
        if (!cnfg) {
            return { signatures: [] };
        }
        const offset = doc.offsetAt(param.position);
        return getSignatureHelp(cnfg, offset);
    }
}

export function getSignatureHelp(
    cnfg: SepticCnfg,
    offset: number
): SignatureHelp {
    const alg = cnfg.getAlgFromOffset(offset);
    if (!alg) {
        return { signatures: [] };
    }
    let parsedAlg: AlgExpr;
    try {
        parsedAlg = parseAlg(alg.getValue()!);
    } catch {
        return { signatures: [] };
    }
    const algVisitor = new AlgVisitor();
    algVisitor.visit(parsedAlg);
    const offsetAlg = offset - (alg.getAttrValue()!.start + 1);
    let currentCalc: AlgCalc | undefined = undefined;
    for (const calc of algVisitor.calcs) {
        const start = calc.start + calc.identifier.length + 1;
        if (offsetAlg >= start && offsetAlg <= calc.end) {
            currentCalc = calc;
        }
    }
    if (!currentCalc) {
        return { signatures: [] };
    }
    const metaInfoProvider = SepticMetaInfoProvider.getInstance();
    const calcMetaInfo = metaInfoProvider.getCalc(currentCalc.identifier);
    if (!calcMetaInfo) {
        return { signatures: [] };
    }
    const currentIndexCalc = getIndexParamCalc(currentCalc, offsetAlg);
    const activeParameterIndex = fromCalcIndexToParamIndex(
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
    for (let i = 0; i < calc.getNumParams(); i++) {
        const param = calc.params[i];
        if (param.end < offset) {
            index += 1;
        } else {
            return index;
        }
    }
    return index;
}
