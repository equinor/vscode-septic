/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs, { CommandModule } from "yargs";
import { SepticCnfg } from "../cnfg";
import {
    getDiagnostics,
    SepticDiagnostic,
    SepticDiagnosticLevel,
} from "../diagnostics";
import { SepticMetaInfoProvider } from "../metaInfoProvider";
import {
    createDocumentFromFile,
    SepticConfigProviderFs,
} from "../configProvider";
import * as fs from "fs";
import * as path from "path";
import { scgConfigFromYAML, ScgContext } from "../scg";

interface LintOptions {
    file: string;
    ignore?: string[];
    septicversion?: string;
}

async function lintSepticConfig(filePath: string): Promise<SepticDiagnostic[]> {
    const document = await createDocumentFromFile(filePath);
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    await cnfg.updateObjectParents();
    return getDiagnostics(cnfg, cnfg).filter(
        (diagnostic) => diagnostic.level !== SepticDiagnosticLevel.hint,
    );
}

async function lintScg(scgConfigPath: string): Promise<SepticDiagnostic[]> {
    let scgConfig;
    try {
        const content = await fs.promises.readFile(scgConfigPath, {
            encoding: "utf-8",
        });
        scgConfig = scgConfigFromYAML(content);
    } catch (error) {
        console.error(`Failed to read or parse SCG config: ${error}`);
        process.exit(1);
    }
    const configProvider = new SepticConfigProviderFs();
    const scgContext = new ScgContext(
        "SCG Context",
        scgConfigPath,
        scgConfig,
        configProvider,
    );
    await scgContext.load();
    await scgContext.updateObjectParents();
    const diagnostics: SepticDiagnostic[] = [];
    for (const file of scgContext.files) {
        const cnfg = await configProvider.get(file);
        if (cnfg === undefined) {
            continue;
        }
        const templateDiagnostics = getDiagnostics(cnfg, scgContext).filter(
            (diagnostic) => diagnostic.level !== SepticDiagnosticLevel.hint,
        );
        diagnostics.push(...templateDiagnostics);
    }
    return diagnostics;
}

function filterDiagnostics(
    diagnostics: SepticDiagnostic[],
    ignoreCodes?: string[],
): SepticDiagnostic[] {
    if (!ignoreCodes || ignoreCodes.length === 0) {
        return diagnostics;
    }
    const ignoreSet = new Set(ignoreCodes.map((code) => code.toUpperCase()));
    return diagnostics.filter(
        (diagnostic) => !ignoreSet.has(diagnostic.code.toUpperCase()),
    );
}

function formatDiagnostic(diagnostic: SepticDiagnostic): string {
    const line = diagnostic.range.start.line + 1;
    const character = diagnostic.range.start.character + 1;
    const level = diagnostic.level.toUpperCase();
    const code = diagnostic.code;
    return `${level} [${code}]: ${diagnostic.message} ${diagnostic.uri}#${line}:${character}`;
}

function printDiagnostics(diagnostics: SepticDiagnostic[]): void {
    if (diagnostics.length === 0) {
        console.log("No issues found!");
        return;
    }
    const files = diagnostics.map((diag) => diag.uri);
    const uniqueFiles = Array.from(new Set(files));
    for (const file of uniqueFiles) {
        const diagsForFile = diagnostics.filter((diag) => diag.uri === file);
        console.log(`\nLinting results for file: ${file}`);
        console.log(`${diagsForFile.length} issue(s) found:`);
        for (const diagnostic of diagsForFile) {
            console.log(formatDiagnostic(diagnostic));
        }
    }
}

async function handler(options: LintOptions): Promise<void> {
    if (options.septicversion) {
        SepticMetaInfoProvider.setVersion(options.septicversion);
    }
    const allDiagnostics: SepticDiagnostic[] = [];
    if (options.file.endsWith(".cnfg")) {
        const fileDiagnostics = await lintSepticConfig(options.file);
        allDiagnostics.push(...fileDiagnostics);
    } else if (options.file.endsWith(".yaml")) {
        console.log(`Linting SCG project ${path.resolve(options.file)}`);
        const scgDiagnostics = await lintScg(options.file);
        allDiagnostics.push(...scgDiagnostics);
    } else {
        console.error(
            "Unsupported file type. Please provide a .cnfg or .yaml file.",
        );
        process.exit(1);
    }

    const diagnostics = filterDiagnostics(allDiagnostics, options.ignore);

    if (options.ignore && options.ignore.length > 0) {
        const ignoredCount = allDiagnostics.length - diagnostics.length;
        if (ignoredCount > 0) {
            console.log(
                `Ignoring ${ignoredCount} diagnostic(s) with code(s): ${options.ignore.join(", ")}`,
            );
        }
    }

    printDiagnostics(diagnostics);

    const exitCode = diagnostics.length === 0 ? 0 : 1;
    process.exit(exitCode);
}

export const lintCommand: CommandModule<object, LintOptions> = {
    command: "lint <file>",
    describe: "Lint a Septic config file",
    builder: (yargs) => {
        const availableVersions = SepticMetaInfoProvider.getAvailableVersions();
        const versionList = availableVersions.join(", ");

        return yargs
            .positional("file", {
                type: "string",
                description:
                    "Path to Septic config file or SCG config file to lint",
                demandOption: true,
            })
            .option("ignore", {
                alias: "i",
                type: "array",
                description: "Diagnostic codes to ignore (e.g., W101 E202)",
                string: true,
            })
            .option("septicversion", {
                alias: "s",
                type: "string",
                description: `Septic version to use for linting (available: ${versionList})`,
                default: "latest",
            })
            .example("$0 lint config.cnfg", "Lint a config file")
            .example("$0 lint scg.yaml", "Lint all templates in an SCG project")
            .example(
                "$0 lint config.cnfg --ignore W101 W203",
                "Lint and ignore specific diagnostic codes",
            )
            .example(
                "$0 lint config.cnfg --septicversion v3.5",
                "Lint using Septic version 3.5",
            ) as unknown as yargs.Argv<LintOptions>;
    },
    handler: (argv) => {
        handler(argv).catch((error) => {
            console.error("Unexpected error:", error);
            process.exit(1);
        });
    },
};
