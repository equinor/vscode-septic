import { AlgCalc, AlgExpr, AlgLiteral, AlgTokenType } from "./alg";
import { SepticCalcInfo } from "./metaInfoProvider";

/* 
    Assumptions:
    1. All optional parameters are at the end of the parameter list
    2. All variable length parameters are grouped together
*/

export function fromCalcIndexToParamIndex(
    calc: AlgCalc,
    calcInfo: SepticCalcInfo,
    index: number,
): number {
    const paramIndexInfo = getCalcParamIndexInfo(calcInfo);
    let i = 0;
    while (i < paramIndexInfo.fixedLengthParams.pre.length) {
        // @ts-expect-error Index will always be valid
        if (index < paramIndexInfo.fixedLengthParams.pre[i]) {
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
            index,
        );
    }
    return getIndexAlternatingParams(paramIndexInfo, index);
}

function isAlternatingParamsCalc(calcInfo: SepticCalcInfo): boolean {
    return !["maxselection", "minselection", "avgselection"].includes(
        calcInfo.name,
    );
}

function getIndexAlternatingParams(
    paramIndexInfo: CalcParamIndexInfo,
    index: number,
) {
    const numFixedLengthParams = paramIndexInfo.fixedLengthParams.pre.length
        ? paramIndexInfo.fixedLengthParams.pre[
              paramIndexInfo.fixedLengthParams.pre.length - 1
          ]!
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
    index: number,
) {
    const paramName = paramIndexInfo.variableLengthParams.exactLength;
    const numFixedLengthParams = paramIndexInfo.fixedLengthParams.pre.length
        ? paramIndexInfo.fixedLengthParams.pre[
              paramIndexInfo.fixedLengthParams.pre.length - 1
          ]
        : 0;
    if (!paramName) {
        return 0;
    }
    const paramIndex = getIndexOfParam(paramName, calcInfo);
    if (paramIndex === undefined) {
        return 0;
    }
    const value = getValueOfAlgExpr(calc.params[paramIndex]!);
    if (!value) {
        return 0;
    }
    return (
        Math.floor((index - numFixedLengthParams!) / value) +
        numFixedLengthParams!
    );
}

export function getIndexOfParam(
    paramName: string,
    calcInfo: SepticCalcInfo,
): number | undefined {
    let index = 0;
    let indexParam = 0;
    while (indexParam < calcInfo.parameters.length) {
        if (calcInfo.parameters[indexParam]!.name === paramName) {
            return index;
        }
        const arityNum = arityToNum(calcInfo.parameters[indexParam]!.arity);
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
    fixedLengthParams: FixedLengthParamsInfo;
    variableLengthParams: VariableLengthParamsInfo;
}

interface VariableLengthParamsInfo {
    num: number;
    exactLength: string | undefined;
}

interface FixedLengthParamsInfo {
    pre: number[];
    post: number[];
    numOptional: number;
}

export function getCalcParamIndexInfo(
    calc: SepticCalcInfo,
): CalcParamIndexInfo {
    return {
        fixedLengthParams: getFixedLengthParamsIndexes(calc),
        variableLengthParams: getVariableLengthParamsInfo(calc),
    };
}

function getFixedLengthParamsIndexes(
    calc: SepticCalcInfo,
): FixedLengthParamsInfo {
    let indexParam = 0;
    const preIndexList = [];
    const postIndexList = [];
    let post = false;
    for (const param of calc.parameters) {
        switch (param.arity) {
            case "+":
                post = true;
                break;
            case "?":
                indexParam += 1;
                if (post) {
                    postIndexList.push(indexParam);
                } else {
                    preIndexList.push(indexParam);
                }
                break;

            default:
                if (
                    param.arity.charAt(0) === "=" ||
                    param.arity.charAt(0) === "$"
                ) {
                    post = true;
                    break;
                }
                indexParam += parseInt(param.arity);
                if (post) {
                    postIndexList.push(indexParam);
                } else {
                    preIndexList.push(indexParam);
                }
                break;
        }
    }
    return {
        pre: preIndexList,
        post: postIndexList,
        numOptional: getNumberOfOptionalParams(calc),
    };
}

function getNumberOfOptionalParams(calc: SepticCalcInfo): number {
    let numOptionalParams = 0;
    calc.parameters.forEach((param) => {
        numOptionalParams += param.arity === "?" ? 1 : 0;
    });
    return numOptionalParams;
}

function getVariableLengthParamsInfo(
    calcInfo: SepticCalcInfo,
): VariableLengthParamsInfo {
    let numVariableLengthParams = 0;
    let exactLength = undefined;
    for (const param of calcInfo.parameters) {
        if (param.arity.charAt(0) === "+" || param.arity.charAt(0) === "=") {
            numVariableLengthParams += 1;
        } else if (param.arity.charAt(0) === "$") {
            exactLength = param.arity.slice(1);
            numVariableLengthParams += 1;
        }
    }
    return { num: numVariableLengthParams, exactLength: exactLength };
}

export function getValueOfAlgExpr(expr: AlgExpr): number | undefined {
    if (!(expr instanceof AlgLiteral)) {
        return undefined;
    }
    const literal = expr as AlgLiteral;
    if (literal.type !== AlgTokenType.number) {
        return undefined;
    }
    return parseInt(literal.value);
}
