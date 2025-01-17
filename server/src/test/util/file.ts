import * as fs from "fs";
import * as path from "path";

export function loadFile(filename: string): string {
    const filePath = path.resolve(__dirname, "..", "fixtures", filename);
    const fileData = fs.readFileSync(filePath, "utf8");
    return fileData.toString();
}
