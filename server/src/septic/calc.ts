import { AlgCalc, AlgExpr, AlgLiteral, AlgTokenType } from "./algParser";
import { SepticCalcInfo } from "./septicMetaInfo";

export function fromCalcIndexToParamIndex(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    index: number
): number {
    let paramIndexInfo = getCalcParamIndexInfo(calcInfo);
    let i = 0;
    while (i < paramIndexInfo.fixedLengthParams.length) {
        if (index < paramIndexInfo.fixedLengthParams[i]) {
            return i;
        }
        i += 1;
    }
    if (!paramIndexInfo.variableLengthParams.num) {
        return i - 1;
    }
    if (!isAlternatingParamsCalc(calcInfo)) {
        return getIndexNonAlternatingParams(
            calcInfo,
            paramIndexInfo,
            calc,
            index
        );
    }
    return getIndexAlternatingParams(paramIndexInfo, index);
}

function isAlternatingParamsCalc(calcInfo: SepticCalcInfo): boolean {
    return !["maxselection", "minselection", "avgselection"].includes(
        calcInfo.name
    );
}

function getIndexAlternatingParams(
    paramIndexInfo: CalcParamIndexInfo,
    index: number
) {
    let numFixedLengthParams = paramIndexInfo.fixedLengthParams.length
        ? paramIndexInfo.fixedLengthParams[
              paramIndexInfo.fixedLengthParams.length - 1
          ]
        : 0;
    return (
        ((index - numFixedLengthParams) %
            paramIndexInfo.variableLengthParams.num) +
        numFixedLengthParams
    );
}

function getIndexNonAlternatingParams(
    calcInfo: SepticCalcInfo,
    paramIndexInfo: CalcParamIndexInfo,
    calc: AlgCalc,
    index: number
) {
    let paramName = paramIndexInfo.variableLengthParams.exactLength;
    let numFixedLengthParams = paramIndexInfo.fixedLengthParams.length
        ? paramIndexInfo.fixedLengthParams[
              paramIndexInfo.fixedLengthParams.length - 1
          ]
        : 0;
    if (!paramName) {
        return 0;
    }
    let paramIndex = getIndexOfParam(paramName, calcInfo);
    if (paramIndex === undefined) {
        return 0;
    }
    let value = getValueOfAlgExpr(calc.params[paramIndex]);
    if (!value) {
        return 0;
    }
    return (
        Math.floor((index - numFixedLengthParams) / value) +
        numFixedLengthParams
    );
}

export function getIndexOfParam(
    paramName: string,
    calcInfo: SepticCalcInfo
): number | undefined {
    let index = 0;
    let indexParam = 0;
    while (indexParam < calcInfo.parameters.length) {
        if (calcInfo.parameters[indexParam].name === paramName) {
            return index;
        }
        let arityNum = arityToNum(calcInfo.parameters[indexParam].arity);
        if (arityNum === -1) {
            return undefined;
        }
        index += arityNum;
        indexParam += 1;
    }
    return undefined;
}

function arityToNum(arity: string): number {
    switch (arity) {
        case "?":
            return 1;
        default:
            if (
                arity.charAt(0) === "+" ||
                arity.charAt(0) === "$" ||
                arity.charAt(0) === "="
            ) {
                return -1;
            }
            return parseInt(arity);
    }
}

export interface CalcParamIndexInfo {
    fixedLengthParams: number[];
    numOptionalParams: number;
    variableLengthParams: VariableLengthParamsInfo;
}

interface VariableLengthParamsInfo {
    num: number;
    exactLength: string | undefined;
}

export function getCalcParamIndexInfo(
    calc: SepticCalcInfo
): CalcParamIndexInfo {
    return {
        fixedLengthParams: getFixedLengthParamsIndexes(calc),
        numOptionalParams: getNumberOfOptionalParams(calc),
        variableLengthParams: getVariableLengthParamsInfo(calc),
    };
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

function getNumberOfOptionalParams(calc: SepticCalcInfo): number {
    let numOptionalParams = 0;
    calc.parameters.forEach((param) => {
        numOptionalParams += param.arity === "?" ? 1 : 0;
    });
    return numOptionalParams;
}

function getVariableLengthParamsInfo(
    calcInfo: SepticCalcInfo
): VariableLengthParamsInfo {
    let numVariableLengthParams = 0;
    let exactLength = undefined;
    for (let param of calcInfo.parameters) {
        if (param.arity.charAt(0) === "+" || param.arity.charAt(0) === "=") {
            numVariableLengthParams += 1;
        } else if (param.arity.charAt(0) === "$") {
            exactLength = param.arity.slice(1);
            numVariableLengthParams += 1;
        }
    }
    return { num: numVariableLengthParams, exactLength: exactLength };
}

function getValueOfAlgExpr(expr: AlgExpr): number | undefined {
    if (!(expr instanceof AlgLiteral)) {
        return undefined;
    }
    let literal = expr as AlgLiteral;
    if (literal.type !== AlgTokenType.number) {
        return undefined;
    }
    return parseInt(literal.value);
}
