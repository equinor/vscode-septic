#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";
import { SepticCnfg } from "../cnfg";
import {
    getDiagnostics,
    SepticDiagnostic,
    SepticDiagnosticLevel,
} from "../diagnostics";

interface LintOptions {
    file: string;
    ignore?: string[];
}

function parseArguments(): LintOptions {
    const argv = yargs(hideBin(process.argv))
        .command("$0 <file>", "Lint a Septic config file", (yargs) => {
            return yargs.positional("file", {
                type: "string",
                description: "Path to Septic config file to lint",
            });
        })
        .option("ignore", {
            alias: "i",
            type: "array",
            description: "Diagnostic codes to ignore (e.g., W101 E202)",
            string: true,
        })
        .example("$0 config.cnfg", "Lint a config file")
        .example(
            "$0 config.cnfg --ignore W101 W203",
            "Lint and ignore specific diagnostic codes",
        )
        .help()
        .parseSync();

    if (!argv.file) {
        console.error("No file specified for linting.");
        process.exit(1);
    }

    const options: LintOptions = {
        file: argv.file as string,
    };

    if (argv.ignore) {
        options.ignore = argv.ignore as string[];
    }

    return options;
}

function validateFileExists(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
}

/**
 * Create a TextDocument from a file path
 */
function createDocumentFromFile(filePath: string): TextDocument {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return TextDocument.create(
        path.resolve(filePath),
        "septic",
        0,
        fileContent,
    );
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

async function main(): Promise<void> {
    const options = parseArguments();
    validateFileExists(options.file);

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

main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
});
