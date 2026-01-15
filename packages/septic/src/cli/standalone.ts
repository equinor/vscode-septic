/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Standalone CLI API that can be called from Rust via rustyscript.
 * This version is designed to work without Node.js fs/path dependencies
 * by receiving content directly as strings.
 * 
 * This is the recommended entry point for rustyscript integration.
 */

import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import { SepticCnfg } from "../cnfg";
import { SepticCnfgFormatter } from "../formatter";
import {
    getDiagnostics,
    SepticDiagnostic,
    SepticDiagnosticLevel,
} from "../diagnostics";

// ============================================================================
// Types
// ============================================================================

export interface FormatResult {
    /** Whether the content was already formatted */
    isFormatted: boolean;
    /** The formatted content */
    formattedContent: string;
    /** Number of edits applied */
    editCount: number;
}

export interface DiagnosticInfo {
    level: string;
    code: string;
    message: string;
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
}

export interface LintResult {
    /** Total number of diagnostics found */
    totalCount: number;
    /** The diagnostics */
    diagnostics: DiagnosticInfo[];
    /** Whether linting passed (no errors/warnings) */
    success: boolean;
}

// ============================================================================
// Format Functions
// ============================================================================

/**
 * Apply text edits to content string
 */
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
            const line = lines[startLine] || "";
            lines[startLine] =
                line.substring(0, startChar) +
                edit.newText +
                line.substring(endChar);
        } else {
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

/**
 * Format a Septic config file content.
 * 
 * @param content - The content of the Septic config file
 * @returns FormatResult with formatted content and metadata
 */
export function format(content: string): FormatResult {
    const document = TextDocument.create("file:///config.cnfg", "septic", 0, content);
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    
    const formatter = new SepticCnfgFormatter(cnfg);
    const edits = formatter.format();
    
    const formattedContent = applyTextEdits(content, edits);
    const isFormatted = content === formattedContent;

    return {
        isFormatted,
        formattedContent,
        editCount: edits.length,
    };
}

// ============================================================================
// Lint Functions
// ============================================================================

/**
 * Convert SepticDiagnostic to a plain object for serialization
 */
function toDiagnosticInfo(diagnostic: SepticDiagnostic): DiagnosticInfo {
    return {
        level: diagnostic.level.toUpperCase(),
        code: diagnostic.code,
        message: diagnostic.message,
        startLine: diagnostic.range.start.line + 1,
        startCharacter: diagnostic.range.start.character + 1,
        endLine: diagnostic.range.end.line + 1,
        endCharacter: diagnostic.range.end.character + 1,
    };
}

/**
 * Lint a Septic config file content.
 * 
 * @param content - The content of the Septic config file
 * @returns Promise<LintResult> with diagnostics and metadata
 */
export async function lint(content: string): Promise<LintResult> {
    const document = TextDocument.create("file:///config.cnfg", "septic", 0, content);
    const cnfg = new SepticCnfg(document);
    cnfg.parse(undefined);
    await cnfg.updateObjectParents();

    const allDiagnostics = getDiagnostics(cnfg, cnfg).filter(
        (diagnostic) => diagnostic.level !== SepticDiagnosticLevel.hint
    );

    return {
        totalCount: allDiagnostics.length,
        diagnostics: allDiagnostics.map(toDiagnosticInfo),
        success: allDiagnostics.length === 0,
    };
}

/**
 * Format a diagnostic as a human-readable string
 */
export function formatDiagnostic(diagnostic: DiagnosticInfo): string {
    return `${diagnostic.level} [${diagnostic.code}]: ${diagnostic.message} at ${diagnostic.startLine}:${diagnostic.startCharacter}`;
}

// Default export for rustyscript
export default {
    format,
    lint,
    formatDiagnostic,
};
