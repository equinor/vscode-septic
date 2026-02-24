/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs, { CommandModule } from "yargs";
import { SepticCnfg } from "../cnfg";
import { convertOPCObjects } from "../opc";
import { createDocumentFromFile } from "../configProvider";
import * as fs from "fs";
import * as path from "path";

interface OpcOptions {
    config: string;
    output: string;
    direction: "sopc-to-ua" | "ua-to-sopc";
}

async function loadSepticConfig(filePath: string): Promise<SepticCnfg> {
    const document = await createDocumentFromFile(filePath);
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    await cnfg.updateObjectParents();
    return cnfg;
}

async function handler(options: OpcOptions): Promise<void> {
    if (!fs.existsSync(options.config)) {
        console.error(`Error: Config file not found: ${options.config}`);
        process.exit(1);
    }

    if (!options.config.endsWith(".cnfg")) {
        console.error(`Error: Config file must be a .cnfg file`);
        process.exit(1);
    }

    console.log(`Loading config: ${options.config}`);
    const cnfg = await loadSepticConfig(options.config);

    console.log(`Converting OPC objects (${options.direction})...`);
    const converted = convertOPCObjects(cnfg, options.direction);

    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, converted.toString(), "utf-8");
    console.log(`Output written to: ${outputPath}`);
}

export const opcCommand: CommandModule<object, OpcOptions> = {
    command: "opc <config> <output>",
    describe:
        "Convert OPC objects in a Septic config between Sopc and UA types",
    builder: (yargs) => {
        return yargs
            .positional("config", {
                type: "string",
                description: "Path to the input config file",
                demandOption: true,
            })
            .positional("output", {
                type: "string",
                description: "Path to the output config file",
                demandOption: true,
            })
            .option("direction", {
                alias: "d",
                type: "string",
                description: "Conversion direction",
                choices: ["sopc-to-ua", "ua-to-sopc"],
                demandOption: true,
            })
            .example(
                "$0 opc input.cnfg output.cnfg --direction sopc-to-ua",
                "Convert Sopc objects to UA objects",
            )
            .example(
                "$0 opc input.cnfg output.cnfg -d ua-to-sopc",
                "Convert UA objects to Sopc objects",
            ) as unknown as yargs.Argv<OpcOptions>;
    },
    handler: (argv) => {
        handler(argv).catch((error) => {
            console.error("Unexpected error:", error);
            process.exit(1);
        });
    },
};
