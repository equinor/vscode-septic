/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Embedded data provider for bundled CLI usage.
 * This module provides the same data as the file-based loading but with
 * data embedded at build time.
 * 
 * The actual data is injected by the esbuild plugin.
 */

// This will be replaced by esbuild with the actual data
declare const __SEPTIC_EMBEDDED_DATA__: EmbeddedData | undefined;

export interface EmbeddedVersionData {
    calcs: unknown[] | null;
    objectsDoc: unknown[] | null;
    snippets: unknown[] | null;
    meta: unknown | null;
}

export interface EmbeddedData {
    objects: unknown[];
    versions: string[];
    versionData: Record<string, EmbeddedVersionData>;
}

let embeddedData: EmbeddedData | null = null;

/**
 * Check if embedded data is available
 */
export function hasEmbeddedData(): boolean {
    return typeof __SEPTIC_EMBEDDED_DATA__ !== 'undefined' && __SEPTIC_EMBEDDED_DATA__ !== null;
}

/**
 * Get the embedded data (throws if not available)
 */
export function getEmbeddedData(): EmbeddedData {
    if (typeof __SEPTIC_EMBEDDED_DATA__ !== 'undefined' && __SEPTIC_EMBEDDED_DATA__ !== null) {
        return __SEPTIC_EMBEDDED_DATA__;
    }
    if (embeddedData) {
        return embeddedData;
    }
    throw new Error('Embedded data not available. This module should only be used in bundled mode.');
}

/**
 * Set embedded data (for testing or manual injection)
 */
export function setEmbeddedData(data: EmbeddedData): void {
    embeddedData = data;
}

/**
 * Get available versions from embedded data
 */
export function getEmbeddedVersions(): string[] {
    const data = getEmbeddedData();
    return data.versions.map(v => v.replace(/_/g, '.'));
}

/**
 * Get objects data from embedded data
 */
export function getEmbeddedObjects(): unknown[] {
    const data = getEmbeddedData();
    return data.objects;
}

/**
 * Get version-specific data from embedded data
 */
export function getEmbeddedVersionData(version: string): EmbeddedVersionData | null {
    const data = getEmbeddedData();
    const normalizedVersion = version.replace(/\./g, '_');
    return data.versionData[normalizedVersion] || data.versionData['latest'] || null;
}
