import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticCnfg } from "./cnfg";
import * as path from "path";
import * as fs from "fs";

export interface ISepticConfigProvider {
    get(resource: string): Promise<SepticCnfg | undefined>;
}

export async function createDocumentFromFile(
    filePath: string,
): Promise<TextDocument> {
    const fileContent = await fs.promises.readFile(filePath, {
        encoding: "utf-8",
    });
    return TextDocument.create(
        path.resolve(filePath),
        "septic",
        0,
        fileContent,
    );
}

export class SepticConfigProviderFs implements ISepticConfigProvider {
    private cache: Map<string, SepticCnfg> = new Map<string, SepticCnfg>();
    constructor() {}

    async get(resource: string): Promise<SepticCnfg | undefined> {
        if (this.cache.has(resource)) {
            return this.cache.get(resource);
        }
        const doc = await createDocumentFromFile(resource);
        const septicCnfg = new SepticCnfg(doc);
        await septicCnfg.parseAsync(undefined);
        this.cache.set(resource, septicCnfg);
        return septicCnfg;
    }
}
