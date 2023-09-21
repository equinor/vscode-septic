import { SepticCalcInfo } from "./septicMetaInfo";

export function fromCalcIndexToParamIndex(
    calc: SepticCalcInfo,
    index: number
): number {
    let fixedLengthParams = getFixedLengthParamsIndexes(calc);
    if (!fixedLengthParams.length) {
        return 0;
    }
    let i = 0;
    while (i < fixedLengthParams.length) {
        if (index < fixedLengthParams[i]) {
            return i;
        }
        i += 1;
    }
    let fixedLengthParamsMax = fixedLengthParams[fixedLengthParams.length - 1];
    if (!isAlternatingParamsCalc(calc)) {
        return -1;
    }
    return getIndexAlternatingParams(calc, index, fixedLengthParamsMax);
}

function getIndexAlternatingParams(
    calc: SepticCalcInfo,
    index: number,
    numFixedLengthParams: number
) {
    let numVariableLengthParams = getNumberOfVariableLengthParams(calc);
    return (
        ((index - numFixedLengthParams) % numVariableLengthParams) +
        numFixedLengthParams
    );
}

function getFixedLengthParamsIndexes(calc: SepticCalcInfo): number[] {
    let indexParam = 0;
    let indexList = [];
    for (let param of calc.parameters) {
        switch (param.arity) {
            case "+":
                return indexList;
            case "?":
                indexParam += 1;
                indexList.push(indexParam);
                break;

            default:
                if (
                    param.arity.charAt(0) === "=" ||
                    param.arity.charAt(0) === "$"
                ) {
                    return indexList;
                }
                indexParam += parseInt(param.arity);
                indexList.push(indexParam);
                break;
        }
    }
    return indexList;
}

function isAlternatingParamsCalc(calcInfo: SepticCalcInfo) {
    return !["MaxSelection", "MinSelection", "AvgSelection"].includes(
        calcInfo.name
    );
}

function getNumberOfVariableLengthParams(calcInfo: SepticCalcInfo) {
    let numVariableLengthParams = 0;
    for (let param of calcInfo.parameters) {
        if (
            param.arity.charAt(0) === "+" ||
            param.arity.charAt(0) === "$" ||
            param.arity.charAt(0) === "="
        ) {
            numVariableLengthParams += 1;
        }
    }
    return numVariableLengthParams;
}
