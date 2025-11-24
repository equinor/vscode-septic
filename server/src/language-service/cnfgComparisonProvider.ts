/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DocumentProvider } from "../documentProvider";
import {
    AlgComparison,
    Attribute,
    parseAlg,
    SepticBase,
    SepticCnfg,
    SepticMetaInfoProvider,
    SepticObject,
} from "../septic";
import * as YAML from "js-yaml";
import * as fs from "fs";
import * as path from "path";

export class CnfgComparisionProvider {
    readonly docProvider: DocumentProvider;

    constructor(docProvider: DocumentProvider) {
        this.docProvider = docProvider;
    }

    public async compareCnfgs(
        prevVersion: SepticCnfg,
        currentVersion: SepticCnfg,
        settingsFile: string
    ): Promise<string> {
        const settings: ComparisonSettings | undefined =
            loadComparisonSettings(settingsFile);
        if (!settings) {
            return "error";
        }
        prevVersion.updateObjectParents();
        currentVersion.updateObjectParents();
        const rootObjectDiff: ObjectDiff = compareObjects(
            prevVersion.objects[0],
            currentVersion.objects[0],
            settings
        );
        if (isNoDiff(rootObjectDiff)) {
            return "";
        }
        const report = await this.generateDiffReportFlat(
            rootObjectDiff,
            settings
        );
        return report;
    }

    public async generateDiffReportFlat(
        rootDiff: ObjectDiff,
        settings: ComparisonSettings
    ): Promise<string> {
        const report: string[] = [];
        const padding = "    ";
        const objectDiff: ObjectDiff[] = flattenObjectDiff(rootDiff);
        const updatedObjects: ObjectDiff[] = objectDiff.filter(
            (item) =>
                item.attributeDiff.length &&
                !settings.ignoredObjectTypes.includes(
                    item.currentObject.type
                ) &&
                !ignoreVariable(
                    item.currentObject.identifier?.id,
                    settings.ignoredVariables
                )
        );
        if (updatedObjects.length) {
            report.push("## Updated objects\n");
        }
        for (const updatedObj of updatedObjects) {
            let linkPrev = await this.getLink(
                updatedObj.prevObject,
                updatedObj.prevObject.uri
            );
            linkPrev = linkPrev ? "  " + linkPrev : "";
            let linkCurrent = await this.getLink(
                updatedObj.currentObject,
                updatedObj.currentObject.uri
            );
            linkCurrent = linkCurrent ? linkCurrent : "";
            report.push(
                `${updatedObj.prevObject.type}: ${updatedObj.prevObject.identifier?.id} ${linkPrev} -> ${linkCurrent}`
            );
            for (const attrDiff of updatedObj.attributeDiff) {
                report.push(
                    padding +
                    `${attrDiff.name}: ${attrDiff.prevValue} -> ${attrDiff.currentValue}`
                );
            }
        }
        let addedObjects: SepticObject[] = getAddedObjects(objectDiff);
        addedObjects = addedObjects.filter(
            (item) =>
                !settings.ignoredObjectTypes.includes(item.type) &&
                !ignoreVariable(item.identifier?.id, settings.ignoredVariables)
        );
        if (addedObjects.length) {
            report.push("\n## Added objects\n");
        }
        for (const addedObj of addedObjects) {
            let link = await this.getLink(addedObj, addedObj.uri);
            link = link ? "  " + link : "";
            report.push(`${addedObj.type}: ${addedObj.identifier?.id}` + link);
        }
        let removedObjects: SepticObject[] = getRemovedObjects(objectDiff);
        removedObjects = removedObjects.filter(
            (item) =>
                !settings.ignoredObjectTypes.includes(item.type) &&
                !ignoreVariable(item.identifier?.id, settings.ignoredVariables)
        );
        if (removedObjects.length) {
            report.push("\n## Removed objects\n");
        }
        for (const removedObj of removedObjects) {
            let link = await this.getLink(removedObj, removedObj.uri);
            link = link ? "  " + link : "";
            report.push(
                `${removedObj.type}: ${removedObj.identifier?.id}` + link
            );
        }
        return report.join("\n");
    }

    public async getLink(element: SepticBase, uri: string): Promise<string> {
        const doc = await this.docProvider.getDocument(uri);
        if (!doc) {
            return "";
        }
        return `${uri}#${doc.positionAt(element.start).line + 1}`;
    }
}

export function compareObjects(
    prevObj: SepticObject,
    currentObj: SepticObject,
    settings: ComparisonSettings
): ObjectDiff {
    const removedObjects: SepticObject[] = [];
    const updatedObjects: ObjectDiff[] = [];
    const ignoredAttributes = settings.ignoredAttributes.find(
        (item) => item.objectName === prevObj.type
    )?.attributes;
    const attributeDiff: AttributeDiff[] = compareAttributes(
        prevObj,
        currentObj,
        ignoredAttributes
    );
    const currentMatchedChildren: SepticObject[] = [];
    for (const prevChild of prevObj.children) {
        const currentChild = currentObj.children.find(
            (item) =>
                item.identifier?.id === prevChild.identifier?.id &&
                item.type === prevChild.type
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
        (item) => !currentMatchedChildren.find((it) => it === item)
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
    ignoredAttributes: string[] | undefined
): AttributeDiff[] {
    const attrDiff: AttributeDiff[] = [];
    const objectDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        prevObj.type
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
            isDiff = !compareAlg(prevValue[0], currentValue[0]);
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
    prevAttr: Attribute | undefined;
    prevValue: string[];
    currentAttr: Attribute | undefined;
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
    if (process.env.NODE_ENV === "test") {
        return path.join(__dirname, `../../../public/defaultComparisonSetting.yaml`);
    }
    return path.join(
        __dirname,
        `../public/defaultComparisonSetting.yaml`
    );
}

function loadComparisonSettings(
    filePath: string
): ComparisonSettings | undefined {
    if (filePath === "Default") {
        filePath = getDefaultSettingsPath();
    }
    const fileStream = fs.readFileSync(filePath, "utf-8");
    const comparisonSettingsInput: ComparisonSettingsInput = YAML.load(
        fileStream
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
    ignoredVariables: string[]
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
