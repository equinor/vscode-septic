/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SepticAttribute, SepticBase, SepticObject } from "./elements";
import { AlgComparison, parseAlg } from "./alg";
import { SepticCnfg } from "./cnfg";
import { SepticMetaInfoProvider } from "./metaInfoProvider";
import * as YAML from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { getBasePublicPath } from "./path";

export function compareCnfgs(
    prevVersion: SepticCnfg,
    currentVersion: SepticCnfg,
    settingsFile: string,
    format: "markdown" | "terminal" = "markdown",
): string {
    const settings: ComparisonSettings | undefined =
        loadComparisonSettings(settingsFile);
    if (!settings) {
        return "";
    }
    const report = generateDiffReportFlat(
        settings,
        prevVersion,
        currentVersion,
        format,
    );
    return report;
}

function generateDiffReportFlat(
    settings: ComparisonSettings,
    prevVersion: SepticCnfg,
    currentVersion: SepticCnfg,
    format: "markdown" | "terminal",
): string {
    prevVersion.updateObjectParents();
    currentVersion.updateObjectParents();
    const rootObjectDiff: ObjectDiff = compareObjects(
        prevVersion.objects[0]!,
        currentVersion.objects[0]!,
        settings,
    );
    const objectDiff: ObjectDiff[] = flattenObjectDiff(rootObjectDiff);
    const updatedObjects: ObjectDiff[] = objectDiff.filter(
        (item) =>
            item.attributeDiff.length &&
            !settings.ignoredObjectTypes.includes(item.currentObject.type) &&
            !ignoreVariable(
                item.currentObject.identifier?.id,
                settings.ignoredVariables,
            ),
    );
    let addedObjects: SepticObject[] = getAddedObjects(objectDiff);
    addedObjects = addedObjects.filter(
        (item) =>
            !settings.ignoredObjectTypes.includes(item.type) &&
            !ignoreVariable(item.identifier?.id, settings.ignoredVariables),
    );
    let removedObjects: SepticObject[] = getRemovedObjects(objectDiff);
    removedObjects = removedObjects.filter(
        (item) =>
            !settings.ignoredObjectTypes.includes(item.type) &&
            !ignoreVariable(item.identifier?.id, settings.ignoredVariables),
    );

    if (format === "markdown") {
        return generateMarkdownReport(
            updatedObjects,
            addedObjects,
            removedObjects,
            prevVersion,
            currentVersion,
        );
    } else {
        return generateTerminalReport(
            updatedObjects,
            addedObjects,
            removedObjects,
            prevVersion,
            currentVersion,
        );
    }
}

function createLink(element: SepticBase, cnfg: SepticCnfg): string {
    const lineNumber = cnfg.positionAt(element.start).line + 1;
    // Use vscode:// URI scheme for better VS Code integration
    const uri = cnfg.uri.replace(/^file:\/\/\//, "");
    return `vscode://file/${uri}:${lineNumber}:1`;
}

function createTerminalLink(url: string, text: string): string {
    // OSC 8 hyperlinks for modern terminals
    // Format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function generateMarkdownReport(
    updatedObjects: ObjectDiff[],
    addedObjects: SepticObject[],
    removedObjects: SepticObject[],
    prevVersion: SepticCnfg,
    currentVersion: SepticCnfg,
): string {
    const report: string[] = [];

    // Header
    report.push("# Configuration Comparison Report\n");
    report.push(`**Previous Version:** \`${prevVersion.uri}\`\n`);
    report.push(`**Current Version:** \`${currentVersion.uri}\`\n`);

    // Summary
    report.push("## 📊 Summary\n");
    report.push("| Category | Count |");
    report.push("|----------|-------|");
    report.push(`| 🔄 Updated Objects | ${updatedObjects.length} |`);
    report.push(`| ➕ Added Objects | ${addedObjects.length} |`);
    report.push(`| ➖ Removed Objects | ${removedObjects.length} |`);
    report.push("");

    // Updated objects
    if (updatedObjects.length) {
        report.push("## 🔄 Updated Objects\n");
        for (const updatedObj of updatedObjects) {
            const linkPrev = createLink(updatedObj.prevObject, prevVersion);
            const linkCurrent = createLink(
                updatedObj.currentObject,
                currentVersion,
            );
            report.push(
                `### \`${updatedObj.prevObject.type}\`: ${updatedObj.prevObject.identifier?.id}\n`,
            );
            report.push(`[Previous](${linkPrev}) → [Current](${linkCurrent})`);
            if (updatedObj.attributeDiff.length) {
                report.push("| Attribute | Previous Value | Current Value |");
                report.push("|-----------|----------------|---------------|");
                for (const attrDiff of updatedObj.attributeDiff) {
                    const prevVal = formatValue(attrDiff.prevValue);
                    const currVal = formatValue(attrDiff.currentValue);
                    report.push(
                        `| \`${attrDiff.name}\` | ${prevVal} | ${currVal} |`,
                    );
                }
                report.push("");
            }
        }
    }

    // Added objects
    if (addedObjects.length) {
        report.push("## ➕ Added Objects\n");
        report.push("| Type | Identifier | Link |");
        report.push("|------|------------|------|");
        for (const addedObj of addedObjects) {
            const link = createLink(addedObj, currentVersion);
            report.push(
                `| \`${addedObj.type}\` | ${addedObj.identifier?.id} | [View](${link}) |`,
            );
        }
        report.push("");
    }

    // Removed objects
    if (removedObjects.length) {
        report.push("## ➖ Removed Objects\n");
        report.push("| Type | Identifier | Link |");
        report.push("|------|------------|------|");
        for (const removedObj of removedObjects) {
            const link = createLink(removedObj, prevVersion);
            report.push(
                `| \`${removedObj.type}\` | ${removedObj.identifier?.id} | [View](${link}) |`,
            );
        }
        report.push("");
    }

    return report.join("\n");
}

function generateTerminalReport(
    updatedObjects: ObjectDiff[],
    addedObjects: SepticObject[],
    removedObjects: SepticObject[],
    prevVersion: SepticCnfg,
    currentVersion: SepticCnfg,
): string {
    const report: string[] = [];
    const colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m",
    };

    // Header
    report.push(`${colors.bright}${"=".repeat(60)}${colors.reset}`);
    report.push(
        `${colors.bright}${colors.cyan}  Configuration Comparison Report${colors.reset}`,
    );
    report.push(`${colors.bright}${"=".repeat(60)}${colors.reset}\n`);

    report.push(`${colors.dim}Previous:${colors.reset} ${prevVersion.uri}`);
    report.push(
        `${colors.dim}Current:${colors.reset}  ${currentVersion.uri}\n`,
    );

    // Summary
    report.push(`${colors.bright}SUMMARY${colors.reset}`);
    report.push(
        `${colors.yellow}  🔄 Updated:${colors.reset} ${updatedObjects.length}`,
    );
    report.push(
        `${colors.green}  ➕ Added:${colors.reset}   ${addedObjects.length}`,
    );
    report.push(
        `${colors.red}  ➖ Removed:${colors.reset} ${removedObjects.length}\n`,
    );

    // Updated objects
    if (updatedObjects.length) {
        report.push(
            `${colors.bright}${colors.yellow}UPDATED OBJECTS${colors.reset}`,
        );
        report.push(`${colors.dim}${"─".repeat(60)}${colors.reset}`);
        for (const updatedObj of updatedObjects) {
            const linkPrev = createLink(updatedObj.prevObject, prevVersion);
            const linkCurrent = createLink(
                updatedObj.currentObject,
                currentVersion,
            );
            const objName = `${updatedObj.prevObject.type}: ${updatedObj.prevObject.identifier?.id}`;

            report.push(`\n${colors.bright}${objName}${colors.reset}`);
            report.push(
                `  ${colors.dim}${createTerminalLink(linkPrev, "Previous")} → ${createTerminalLink(linkCurrent, "Current")}${colors.reset}`,
            );

            for (const attrDiff of updatedObj.attributeDiff) {
                const prevVal = attrDiff.prevValue.join(", ");
                const currVal = attrDiff.currentValue.join(", ");
                report.push(
                    `  ${colors.cyan}${attrDiff.name}: ${colors.reset}${colors.red}${prevVal}${colors.reset} -> ${colors.green}${currVal}${colors.reset}`,
                );
            }
        }
        report.push("");
    }

    // Added objects
    if (addedObjects.length) {
        report.push(
            `${colors.bright}${colors.green}ADDED OBJECTS${colors.reset}`,
        );
        report.push(`${colors.dim}${"─".repeat(60)}${colors.reset}`);
        for (const addedObj of addedObjects) {
            const link = createLink(addedObj, currentVersion);
            const objText = `${addedObj.type}: ${addedObj.identifier?.id}`;
            const linkedText = createTerminalLink(link, objText);
            report.push(
                `  ${colors.green}+${colors.reset} ${colors.bright}${linkedText}${colors.reset}`,
            );
        }
        report.push("");
    }

    // Removed objects
    if (removedObjects.length) {
        report.push(
            `${colors.bright}${colors.red}REMOVED OBJECTS${colors.reset}`,
        );
        report.push(`${colors.dim}${"─".repeat(60)}${colors.reset}`);
        for (const removedObj of removedObjects) {
            const link = createLink(removedObj, prevVersion);
            const objText = `${removedObj.type}: ${removedObj.identifier?.id}`;
            const linkedText = createTerminalLink(link, objText);
            report.push(
                `  ${colors.red}─${colors.reset} ${colors.bright}${linkedText}${colors.reset}`,
            );
        }
        report.push("");
    }

    report.push(`${colors.bright}${"=".repeat(60)}${colors.reset}`);
    return report.join("\n");
}

function formatValue(value: string[]): string {
    if (value.length === 1) {
        return `\`${value[0]}\``;
    }
    return `\`${value.join(", ")}\``;
}

export function compareObjects(
    prevObj: SepticObject,
    currentObj: SepticObject,
    settings: ComparisonSettings,
): ObjectDiff {
    const removedObjects: SepticObject[] = [];
    const updatedObjects: ObjectDiff[] = [];
    const ignoredAttributes = settings.ignoredAttributes.find(
        (item) => item.objectName === prevObj.type,
    )?.attributes;
    const attributeDiff: AttributeDiff[] = compareAttributes(
        prevObj,
        currentObj,
        ignoredAttributes,
    );
    const currentMatchedChildren: SepticObject[] = [];
    for (const prevChild of prevObj.children) {
        const currentChild = currentObj.children.find(
            (item) =>
                item.identifier?.id === prevChild.identifier?.id &&
                item.type === prevChild.type,
        );
        if (!currentChild) {
            removedObjects.push(prevChild);
            continue;
        }
        currentMatchedChildren.push(currentChild);
        const objectDiff = compareObjects(prevChild, currentChild, settings);
        if (!isNoDiff(objectDiff)) {
            updatedObjects.push(objectDiff);
        }
    }
    const addedObjects: SepticObject[] = currentObj.children.filter(
        (item) => !currentMatchedChildren.find((it) => it === item),
    );
    return {
        prevObject: prevObj,
        currentObject: currentObj,
        attributeDiff: attributeDiff,
        addedObjects: addedObjects,
        removedObjects: removedObjects,
        updatedObjects: updatedObjects,
    };
}

const defaultIgnoredAttributes: string[] = ["Text1", "Text2"];

export function compareAttributes(
    prevObj: SepticObject,
    currentObj: SepticObject,
    ignoredAttributes: string[] | undefined,
): AttributeDiff[] {
    const attrDiff: AttributeDiff[] = [];
    const objectDoc =
        SepticMetaInfoProvider.getInstance().getObjectDocumentation(
            prevObj.type,
        );
    if (!objectDoc) {
        return [];
    }
    for (const attr of objectDoc.attributes) {
        if (
            defaultIgnoredAttributes.includes(attr.name) ||
            ignoredAttributes?.includes(attr.name)
        ) {
            continue;
        }
        const prevAttr = prevObj.getAttribute(attr.name);
        const prevValue = prevAttr?.getValues() ?? attr.default;
        const currentAttr = currentObj.getAttribute(attr.name);
        const currentValue = currentAttr?.getValues() ?? attr.default;
        let isDiff = false;
        if (prevObj.type === "CalcPvr" && attr.name === "Alg") {
            isDiff = !compareAlg(prevValue[0]!, currentValue[0]!);
        } else {
            isDiff = prevValue.toString() !== currentValue.toString();
        }
        if (isDiff) {
            attrDiff.push({
                name: attr.name,
                prevAttr: prevAttr,
                prevValue: prevValue,
                currentAttr: currentAttr,
                currentValue: currentValue,
            });
        }
    }
    return attrDiff;
}

export function compareAlg(prevAlg: string, currentAlg: string): boolean {
    if (prevAlg === currentAlg) {
        return true;
    }
    let prevExpr;
    try {
        prevExpr = parseAlg(prevAlg);
    } catch {
        return false;
    }
    let currentExpr;
    try {
        currentExpr = parseAlg(currentAlg);
    } catch {
        return false;
    }
    const algComparator = new AlgComparison();
    return algComparator.visit(prevExpr, currentExpr);
}

function flattenObjectDiff(objectDiff: ObjectDiff): ObjectDiff[] {
    const flatDiff: ObjectDiff[] = [];
    flatDiff.push(objectDiff);
    for (const updatedChilds of objectDiff.updatedObjects) {
        flatDiff.push(...flattenObjectDiff(updatedChilds));
    }
    return flatDiff;
}

function getAddedObjects(objectDiff: ObjectDiff[]): SepticObject[] {
    const addedObjects: SepticObject[] = [];
    for (const diff of objectDiff) {
        for (const addedObj of diff.addedObjects) {
            addedObjects.push(addedObj);
            addedObjects.push(...getDescendants(addedObj));
        }
    }
    return addedObjects;
}

function getRemovedObjects(objectDiff: ObjectDiff[]): SepticObject[] {
    const addedObjects: SepticObject[] = [];
    for (const diff of objectDiff) {
        for (const removedObj of diff.removedObjects) {
            addedObjects.push(removedObj);
            addedObjects.push(...getDescendants(removedObj));
        }
    }
    return addedObjects;
}

function getDescendants(obj: SepticObject): SepticObject[] {
    const children: SepticObject[] = [];
    for (const child of obj.children) {
        children.push(child);
        children.push(...getDescendants(child));
    }
    return children;
}
export interface ObjectDiff {
    prevObject: SepticObject;
    currentObject: SepticObject;
    attributeDiff: AttributeDiff[];
    addedObjects: SepticObject[];
    removedObjects: SepticObject[];
    updatedObjects: ObjectDiff[];
}

export interface AttributeDiff {
    name: string;
    prevAttr: SepticAttribute | undefined;
    prevValue: string[];
    currentAttr: SepticAttribute | undefined;
    currentValue: string[];
}

export function isNoDiff(diff: ObjectDiff) {
    return !(
        diff.addedObjects.length ||
        diff.attributeDiff.length ||
        diff.removedObjects.length ||
        diff.updatedObjects.length
    );
}

interface ComparisonSettingsInput {
    ignoredVariables?: string[];
    ignoredObjectTypes?: string[];
    ignoredAttributes?: {
        objectName: string;
        attributes: string[];
    }[];
}

export interface ComparisonSettings {
    ignoredVariables: string[];
    ignoredObjectTypes: string[];
    ignoredAttributes: {
        objectName: string;
        attributes: string[];
    }[];
}

function getDefaultSettingsPath(): string {
    const basePath = getBasePublicPath();
    return path.join(basePath, `defaultComparisonSetting.yaml`);
}

function loadComparisonSettings(
    filePath: string,
): ComparisonSettings | undefined {
    if (filePath === "Default") {
        filePath = getDefaultSettingsPath();
    }
    const fileStream = fs.readFileSync(filePath, "utf-8");
    const comparisonSettingsInput: ComparisonSettingsInput = YAML.load(
        fileStream,
    ) as ComparisonSettings;
    const comparisonSettings: ComparisonSettings = {
        ignoredVariables: comparisonSettingsInput.ignoredVariables ?? [],
        ignoredObjectTypes: comparisonSettingsInput.ignoredObjectTypes ?? [],
        ignoredAttributes: comparisonSettingsInput.ignoredAttributes ?? [],
    };
    return comparisonSettings;
}

function ignoreVariable(
    id: string | undefined,
    ignoredVariables: string[],
): boolean {
    if (!id) {
        return false;
    }
    for (const pattern of ignoredVariables) {
        const regex = new RegExp(pattern);
        if (regex.test(id)) {
            return true;
        }
    }
    return false;
}
