import * as path from "path";

export function getSearchPattern(worskspacePath: string, templatePath: string) {
    let baseWorkspace = path.basename(worskspacePath);
    let parts: string[] = [];
    let temp = templatePath;
    while (path.basename(temp) !== baseWorkspace) {
        parts.push(path.basename(temp));
        temp = path.dirname(temp);
    }

    parts = parts.reverse();

    return "**/" + parts.join("/") + "/**.cnfg";
}
