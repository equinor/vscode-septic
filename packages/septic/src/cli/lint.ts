/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs, { CommandModule } from "yargs";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticCnfg } from "../cnfg";
import {
    getDiagnostics,
    SepticDiagnostic,
    SepticDiagnosticLevel,
} from "../diagnostics";
import { SepticMetaInfoProvider } from "../metaInfoProvider";
import { validateFileExists, createDocumentFromFile } from "./utils";

interface LintOptions {
    file: string;
    ignore?: string[];
    septicversion?: string;
}

async function lintSepticConfig(
    document: TextDocument,
): Promise<SepticDiagnostic[]> {
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    await cnfg.updateObjectParents();
    return getDiagnostics(cnfg, cnfg).filter(
        (diagnostic) => diagnostic.level !== SepticDiagnosticLevel.hint,
    );
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

function formatDiagnostic(diagnostic: SepticDiagnostic, uri: string): string {
    const line = diagnostic.range.start.line + 1;
    const character = diagnostic.range.start.character + 1;
    const level = diagnostic.level.toUpperCase();
    const code = diagnostic.code;
    return `${level} [${code}]: ${diagnostic.message} ${uri}#${line}:${character}`;
}

function printDiagnostics(diagnostics: SepticDiagnostic[], uri: string): void {
    if (diagnostics.length === 0) {
        console.log("No issues found.");
        return;
    }

    console.log(`${diagnostics.length} issue(s) found:`);
    for (const diagnostic of diagnostics) {
        console.log(formatDiagnostic(diagnostic, uri));
    }
}

async function handler(options: LintOptions): Promise<void> {
    validateFileExists(options.file);

    // Set the version to use for linting
    if (options.septicversion) {
        SepticMetaInfoProvider.setVersion(options.septicversion);
    }

    const document = createDocumentFromFile(options.file);
    const allDiagnostics = await lintSepticConfig(document);
    const diagnostics = filterDiagnostics(allDiagnostics, options.ignore);

    if (options.ignore && options.ignore.length > 0) {
        const ignoredCount = allDiagnostics.length - diagnostics.length;
        if (ignoredCount > 0) {
            console.log(
                `Ignoring ${ignoredCount} diagnostic(s) with code(s): ${options.ignore.join(", ")}`,
            );
        }
    }

    printDiagnostics(diagnostics, document.uri);

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
                description: "Path to Septic config file to lint",
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
