/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const NUMERIC_REGEX = /^(?:[+-]?\d+\.?\d*)(?:[eE][+-]?\d+\.?\d*)?\b/;
export const OBJECT_REGEX = /^\b([\w]*):\s/;
export const ATTRIBUTE_REGEX = /^\b([\w\-]*)=\s/;
export const BLOCK_COMMENT_REGEX = /^\/\*[\s\S]*?\*\//;
export const LINE_COMMENT_REGEX = /^(\/\/)(.*)[\n\r]?/;
export const JINJA_COMMENT_REGEX = /^\{#[\s\S]*?#\}/;
export const JINJA_EXPRESSION_REGEX = /^\{%[\s\S]*?%\}/;
export const STRING_REGEX = /^"(.*?)"/;
export const SKIP_REGEX = /^[\s]+/;
export const UNKNOWN_REGEX = /^./;
export const IDENTIFIER_REGEX = /^(\{\{\s*[\w\-]+\s*\}\}|[\w\-\*\!\?]+)+/;
