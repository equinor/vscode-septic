import { SepticCalcInfo } from "./septicMetaInfo";

export interface ICalcNumParameter {
    minNumber: number;
    maxNumber: number;
    maxActive: boolean;
    parityActive: boolean;
}

export function calcNumParameterInfo(
    calcInfo: SepticCalcInfo
): ICalcNumParameter {
    let minNumber = 0;
    let maxNumber = 0;
    let maxActive = true;
    let parityActive = true;
    for (let i = 0; i < calcInfo.parameters.length; i++) {
        let param = calcInfo.parameters[i];
        switch (param.arity) {
            case "even":
                maxActive = false;
                minNumber += 2;
                break;
            case "odd":
                maxActive = false;
                minNumber += 1;
                break;
            case "+":
                maxActive = false;
                parityActive = false;
                minNumber += 1;
                break;
            case "optional":
                let restIsOptional = true;
                for (let j = i + 1; j < calcInfo.parameters.length; j++) {
                    if (calcInfo.parameters[j].arity !== "optional") {
                        restIsOptional = false;
                        break;
                    }
                }
                if (!restIsOptional) {
                    minNumber += 1;
                } else {
                    parityActive = false;
                }
                maxNumber += 1;
                break;
            default:
                let n = parseInt(param.arity);
                minNumber += n;
                maxNumber += n;
                break;
        }
    }
    return {
        minNumber: minNumber,
        maxNumber: maxNumber,
        maxActive: maxActive,
        parityActive: parityActive,
    };
}

export function arityToNum(arity: string): number {
    switch (arity) {
        case "even":
        case "odd":
        case "+":
            return Infinity;
        case "optional":
            return 1;
        default:
            return parseInt(arity);
    }
}
