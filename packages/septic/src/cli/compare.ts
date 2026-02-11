/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs, { CommandModule } from "yargs";
import { SepticCnfg } from "../cnfg";
import { compareCnfgs } from "../compare";
import { createDocumentFromFile } from "../configProvider";
import * as fs from "fs";
import * as path from "path";

interface CompareOptions {
    previous: string;
    current: string;
    settings?: string;
    output?: string;
    showFormat?: boolean;
}

async function loadSepticConfig(filePath: string): Promise<SepticCnfg> {
    const document = await createDocumentFromFile(filePath);
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    await cnfg.updateObjectParents();
    return cnfg;
}

function showYamlFormat(): void {
    const yamlFormat = `# Comparison Settings YAML Format
# This file defines which variables, object types, and attributes to ignore during comparison

# List of variable name patterns to ignore (supports regex)
ignoredVariables:
  - "pattern1"
  - "pattern2"

# List of object types to ignore completely
ignoredObjectTypes:
  - ImageStatusLabel
  - Spacer

# List of attributes to ignore for specific object types
ignoredAttributes:
  - objectName: Evr
    attributes:
      - Meas
  - objectName: Mvr
    attributes:
      - Meas
      - MeasBad
      - Mode
`;
    console.log(yamlFormat);
}

async function handler(options: CompareOptions): Promise<void> {
    // Show YAML format if requested
    if (options.showFormat) {
        showYamlFormat();
        return;
    }

    // Validate that file paths are provided
    if (!options.previous || !options.current) {
        console.error(
            "Error: Both previous and current file paths are required when not using --show-format",
        );
        process.exit(1);
    }

    // Validate that both files exist
    if (!fs.existsSync(options.previous)) {
        console.error(
            `Error: Previous version file not found: ${options.previous}`,
        );
        process.exit(1);
    }
    if (!fs.existsSync(options.current)) {
        console.error(
            `Error: Current version file not found: ${options.current}`,
        );
        process.exit(1);
    }

    // Validate file extensions
    if (!options.previous.endsWith(".cnfg")) {
        console.error(`Error: Previous version file must be a .cnfg file`);
        process.exit(1);
    }
    if (!options.current.endsWith(".cnfg")) {
        console.error(`Error: Current version file must be a .cnfg file`);
        process.exit(1);
    }

    // Load both config files
    console.log(`Loading previous version: ${options.previous}`);
    const prevCnfg = await loadSepticConfig(options.previous);

    console.log(`Loading current version: ${options.current}`);
    const currentCnfg = await loadSepticConfig(options.current);

    // Use default settings if not specified
    const settingsFile = options.settings || "Default";

    // Determine format: if output is specified and ends with .md, use markdown; otherwise use terminal
    const format: "markdown" | "terminal" = options.output
        ? "markdown"
        : "terminal";

    // Perform comparison
    console.log(`Comparing configurations...`);
    let report: string;
    try {
        report = compareCnfgs(prevCnfg, currentCnfg, settingsFile, format);
    } catch (error) {
        console.error(`Error during comparison: ${error}`);
        process.exit(1);
    }

    if (!report || report.trim().length === 0) {
        report = "No differences found between the configurations.";
    }

    // Output to file or terminal
    if (options.output) {
        const outputPath = path.resolve(options.output);
        const outputDir = path.dirname(outputPath);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, report, "utf-8");
        console.log(`✓ Comparison report saved to: ${outputPath}`);
    } else {
        // Output to terminal
        console.log("\n" + report);
    }
}

export const compareCommand: CommandModule<object, CompareOptions> = {
    command: "compare [previous] [current]",
    describe: "Compare two Septic config files and generate a diff report",
    builder: (yargs) => {
        return yargs
            .positional("previous", {
                type: "string",
                description: "Path to the previous version of the config file",
                demandOption: false,
            })
            .positional("current", {
                type: "string",
                description: "Path to the current version of the config file",
                demandOption: false,
            })
            .option("settings", {
                alias: "s",
                type: "string",
                description:
                    'Path to comparison settings YAML file (use "Default" for default settings)',
            })
            .option("output", {
                alias: "o",
                type: "string",
                description:
                    "Output file path for the comparison report (if not specified, prints to terminal)",
            })
            .option("show-format", {
                type: "boolean",
                description:
                    "Display the YAML format/schema for comparison settings file",
                default: false,
            })
            .example(
                "$0 compare old.cnfg new.cnfg",
                "Compare two config files and print to terminal",
            )
            .example(
                "$0 compare old.cnfg new.cnfg --output report.md",
                "Compare two config files and save report to file",
            )
            .example(
                "$0 compare old.cnfg new.cnfg --settings custom.yaml",
                "Compare with custom comparison settings",
            )
            .example(
                "$0 compare old.cnfg new.cnfg -o diff.md -s settings.yaml",
                "Compare with custom settings and save to markdown file",
            )
            .example(
                "$0 compare --show-format",
                "Display the YAML format for comparison settings",
            ) as unknown as yargs.Argv<CompareOptions>;
    },
    handler: (argv) => {
        handler(argv).catch((error) => {
            console.error("Unexpected error:", error);
            process.exit(1);
        });
    },
};
