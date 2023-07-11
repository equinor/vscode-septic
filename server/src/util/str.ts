export function removeSpaces(str: string) {
    return str.replace(/\s/g, "");
}

export function isPureJinja(str: string) {
    return /^\{\{.*\}\}$/.test(str);
}

export function isAlphaNumeric(char: string): boolean {
    return /^[a-zA-Z0-9]$/.test(char);
}
