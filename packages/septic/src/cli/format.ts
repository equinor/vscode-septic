#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
    TextDocument,
    TextEdit,
} from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";
import { SepticCnfg } from "../cnfg";
import { SepticCnfgFormatter } from "../formatter";
import {
    validateFileExists,
    createDocumentFromFile,
    runCli,
} from "./utils";

interface FormatOptions {
    file: string;
    check?: boolean | undefined;
    output?: string | undefined;
}

function parseArguments(): FormatOptions {
    const argv = yargs(hideBin(process.argv))
        .command("$0 <file>", "Format a Septic config file", (yargs) => {
            return yargs.positional("file", {
                type: "string",
                description: "Path to Septic config file to format",
            });
        })
        .option("check", {
            alias: "c",
            type: "boolean",
            description: "Check if the file is formatted without modifying it",
            default: false,
        })
        .option("output", {
            alias: "o",
            type: "string",
            description:
                "Output path for formatted file (default: overwrites input file)",
        })
        .example("$0 config.cnfg", "Format a config file")
        .example(
            "$0 config.cnfg --check",
            "Check if a config file is formatted",
        )
        .example(
            "$0 config.cnfg --output formatted.cnfg",
            "Format and save to a different file",
        )
        .help()
        .parseSync();

    if (!argv.file) {
        console.error("No file specified for formatting.");
        process.exit(1);
    }

    const options: FormatOptions = {
        file: argv.file as string,
        check: argv.check,
        output: argv.output,
    };

    return options;
}

function formatSepticConfig(document: TextDocument): TextEdit[] {
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    const formatter = new SepticCnfgFormatter(cnfg);
    return formatter.format();
}

function applyTextEdits(content: string, edits: TextEdit[]): string {
    const sortedEdits = edits.sort((a, b) => {
        const lineCompare = b.range.start.line - a.range.start.line;
        if (lineCompare !== 0) return lineCompare;
        return b.range.start.character - a.range.start.character;
    });

    const lines = content.split("\n");

    for (const edit of sortedEdits) {
        const startLine = edit.range.start.line;
        const startChar = edit.range.start.character;
        const endLine = edit.range.end.line;
        const endChar = edit.range.end.character;

        if (startLine === endLine) {
            // Single line edit
            const line = lines[startLine] || "";
            lines[startLine] =
                line.substring(0, startChar) +
                edit.newText +
                line.substring(endChar);
        } else {
            // Multi-line edit
            const firstLine = lines[startLine] || "";
            const lastLine = lines[endLine] || "";

            const newContent =
                firstLine.substring(0, startChar) +
                edit.newText +
                lastLine.substring(endChar);

            lines.splice(
                startLine,
                endLine - startLine + 1,
                ...newContent.split("\n"),
            );
        }
    }

    return lines.join("\n");
}

function checkFormatting(
    originalContent: string,
    formattedContent: string,
): boolean {
    return originalContent === formattedContent;
}

async function main(): Promise<void> {
    const options = parseArguments();
    validateFileExists(options.file);

    const document = createDocumentFromFile(options.file);
    const originalContent = document.getText();

    const edits = formatSepticConfig(document);
    const formattedContent = applyTextEdits(originalContent, edits);

    if (options.check) {
        const isFormatted = checkFormatting(originalContent, formattedContent);
        if (isFormatted) {
            console.log(`✓ ${options.file} is formatted correctly`);
            process.exit(0);
        } else {
            console.log(`✗ ${options.file} needs formatting`);
            process.exit(1);
        }
    }

    const outputPath = options.output || options.file;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, formattedContent, "utf-8");

    if (options.output) {
        console.log(`✓ Formatted file saved to: ${outputPath}`);
    } else {
        console.log(`✓ Formatted: ${options.file}`);
    }
}

runCli(main);
