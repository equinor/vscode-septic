/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs, { CommandModule } from "yargs";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { SepticCnfg } from "../cnfg";
import { SepticCnfgFormatter } from "../formatter";
import { createDocumentFromFile } from "../configProvider";

interface FormatOptions {
    file: string;
    check?: boolean | undefined;
    output?: string | undefined;
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

async function formatSingleFile(
    filePath: string,
    check: boolean,
    outputPath?: string,
): Promise<{ needsFormatting: boolean; filePath: string }> {
    const document = await createDocumentFromFile(filePath);
    const originalContent = document.getText();

    const edits = formatSepticConfig(document);
    const formattedContent = applyTextEdits(originalContent, edits);

    const isFormatted = checkFormatting(originalContent, formattedContent);

    if (check) {
        if (isFormatted) {
            console.log(`✓ ${filePath} is formatted correctly`);
        } else {
            console.log(`✗ ${filePath} needs formatting`);
        }
        return { needsFormatting: !isFormatted, filePath };
    }

    const actualOutputPath = outputPath || filePath;
    const outputDir = path.dirname(actualOutputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(actualOutputPath, formattedContent, "utf-8");

    if (outputPath) {
        console.log(`✓ Formatted file saved to: ${actualOutputPath}`);
    } else {
        console.log(`✓ Formatted: ${filePath}`);
    }

    return { needsFormatting: false, filePath };
}

async function handler(options: FormatOptions): Promise<void> {
    // Ensure the pattern includes .cnfg extension
    let pattern = options.file;
    if (!pattern.endsWith(".cnfg")) {
        pattern = pattern + ".cnfg";
    }

    // Find all files matching the pattern
    const files = await glob(pattern, {
        absolute: true,
        nodir: true,
        windowsPathsNoEscape: true,
    });

    if (files.length === 0) {
        // Try treating it as a literal file path
        if (fs.existsSync(pattern)) {
            files.push(path.resolve(pattern));
        } else {
            console.error(`No files found matching pattern: ${pattern}`);
            process.exit(1);
        }
    }

    // If output is specified and multiple files matched, this is an error
    if (options.output && files.length > 1) {
        console.error(
            `Error: Cannot specify --output when multiple files match the pattern`,
        );
        process.exit(1);
    }

    const results = await Promise.all(
        files.map((file) =>
            formatSingleFile(file, options.check || false, options.output),
        ),
    );

    if (options.check) {
        const filesNeedingFormatting = results.filter((r) => r.needsFormatting);
        if (filesNeedingFormatting.length > 0) {
            console.log(
                `\n${filesNeedingFormatting.length} file(s) need formatting`,
            );
            process.exit(1);
        } else {
            console.log(
                `\nAll ${files.length} file(s) are formatted correctly`,
            );
            process.exit(0);
        }
    }
}

export const formatCommand: CommandModule<object, FormatOptions> = {
    command: "format <file>",
    describe: "Format Septic config file(s) matching a pattern",
    builder: (yargs) => {
        return yargs
            .positional("file", {
                type: "string",
                description:
                    "Path or glob pattern to Septic config file(s) to format",
                demandOption: true,
            })
            .option("check", {
                alias: "c",
                type: "boolean",
                description:
                    "Check if file(s) are formatted without modifying them",
                default: false,
            })
            .option("output", {
                alias: "o",
                type: "string",
                description:
                    "Output path for formatted file (only works with single file)",
            })
            .example("$0 format config.cnfg", "Format a single config file")
            .example(
                "$0 format '**/*.cnfg'",
                "Format all .cnfg files recursively",
            )
            .example(
                "$0 format '**/*.cnfg' --check",
                "Check if all .cnfg files are formatted",
            )
            .example(
                "$0 format config.cnfg --output formatted.cnfg",
                "Format and save to a different file",
            ) as unknown as yargs.Argv<FormatOptions>;
    },
    handler: (argv) => {
        handler(argv).catch((error) => {
            console.error("Unexpected error:", error);
            process.exit(1);
        });
    },
};
