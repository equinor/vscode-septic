export function removeSpaces(str: string) {
    return str.replace(/\s/g, "");
}

export function isPureJinja(str: string) {
    return /^\{\{.*\}\}$/.test(str);
}

export function isAlphaNumeric(char: string): boolean {
    return /^[a-zA-Z0-9]$/.test(char);
}

export function removeJinjaLoopsAndIfs(input: string): { strippedString: string, positionsMap: number[] } {
    let positionsMap: number[] = [];
    let regex = /{%\s*for .*?\s*%}|{%\s*endfor\s*%}|{%\s*if .*?\s*%}.*?{%\s*endif\s*%}/g
    let strippedString = input.replace(regex, (match, offset) => {
        positionsMap.push(offset, offset + match.length);
        return '';
    });
    return { strippedString, positionsMap };
}

export function transformPositionsToOriginal(positions: number[], positionsMap: number[]): number[] {
    let originalPositions: number[] = [];
    for (let pos of positions) {
        let orignalPosition = pos;
        for (let i = 0; i < positionsMap.length; i += 2) {
            if (orignalPosition >= positionsMap[i] && orignalPosition <= positionsMap[i + 1]) {
                orignalPosition += positionsMap[i + 1] - positionsMap[i];
            } else if (i + 2 >= positionsMap.length) {
                orignalPosition += positionsMap[i + 1] - positionsMap[i];
            }
            if (i + 2 >= positionsMap.length || orignalPosition < positionsMap[i + 2]) {
                originalPositions.push(orignalPosition);
                break;
            }
        }
    }
    return originalPositions;
}