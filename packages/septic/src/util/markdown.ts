export function italic(str: string) {
    return "*" + str + "*";
}

export function bold(str: string) {
    return "**" + str + "**";
}

export function code(str: string) {
    return "`" + str + "`";
}

export function h3(str: string) {
    return "### " + str;
}

export function h4(str: string) {
    return "#### " + str;
}

export function horizontalRule() {
    return "---";
}
