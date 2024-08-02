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

export class CnfgComparisionProvider {
    readonly docProvider: DocumentProvider;

    constructor(docProvider: DocumentProvider) {
        this.docProvider = docProvider;
    }

    public async compareCnfgs(
        prevVersion: SepticCnfg,
        currentVersion: SepticCnfg
    ): Promise<string> {
        prevVersion.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        currentVersion.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let rootObjectDiff: ObjectDiff = compareObjects(
            prevVersion.objects[0],
            currentVersion.objects[0]
        );
        if (isNoDiff(rootObjectDiff)) {
            return "";
        }
        let report = await this.generateDiffReportFlat(rootObjectDiff);
        return report;
    }

    public async generateDiffReport(
        rootDiff: ObjectDiff,
        indents: number = 0
    ): Promise<string> {
        let report: string[] = [];
        let padding: string = " ".repeat(indents);
        let linkPrev = await this.getLink(
            rootDiff.prevObject,
            rootDiff.prevObject.uri
        );
        linkPrev = linkPrev ? "  " + linkPrev : "";
        let linkCurrent = await this.getLink(
            rootDiff.currentObject,
            rootDiff.currentObject.uri
        );
        linkCurrent = linkCurrent ? "  " + linkCurrent : "";
        report.push(
            padding +
                `${rootDiff.prevObject.type}: ${rootDiff.prevObject.identifier?.name}`
        );
        report.push(padding + "Prev:" + linkPrev);
        report.push(padding + "Current:" + linkCurrent);
        if (rootDiff.attributeDiff.length) {
            report.push(padding + "Attribute Diff:");
            for (const attrDiff of rootDiff.attributeDiff) {
                let linkPrev = attrDiff.prevAttr
                    ? await this.getLink(
                          attrDiff.prevAttr,
                          rootDiff.prevObject.uri
                      )
                    : "";
                linkPrev = linkPrev ? "  " + linkPrev : "";
                let linkCurrent = attrDiff.prevAttr
                    ? await this.getLink(
                          attrDiff.prevAttr,
                          rootDiff.prevObject.uri
                      )
                    : "";
                linkCurrent = linkCurrent ? "  " + linkCurrent : "";
                report.push(padding + " ".repeat(4) + `${attrDiff.name}`);
                report.push(
                    padding +
                        " ".repeat(2 * 4) +
                        "Prev Value: " +
                        `${attrDiff.prevValue}` +
                        linkPrev
                );
                report.push(
                    padding +
                        " ".repeat(2 * 4) +
                        "Current Value: " +
                        `${attrDiff.currentValue}` +
                        linkCurrent
                );
            }
        }
        if (rootDiff.addedObjects.length) {
            report.push(padding + "Added children:");
            for (const addedObj of rootDiff.addedObjects) {
                let link = await this.getLink(addedObj, addedObj.uri);
                link = link ? "  " + link : "";
                report.push(
                    padding +
                        " ".repeat(4) +
                        `${addedObj.type}: ${addedObj.identifier?.id}` +
                        link
                );
            }
        }
        if (rootDiff.removedObjects.length) {
            report.push(padding + "Removed children:");
            for (const removedObj of rootDiff.addedObjects) {
                let link = await this.getLink(removedObj, removedObj.uri);
                link = link ? "  " + link : "";
                report.push(
                    padding +
                        " ".repeat(4) +
                        `${removedObj.type}: ${removedObj.identifier?.id}` +
                        link
                );
            }
        }
        if (rootDiff.updatedObjects.length) {
            report.push(padding + "Updated children");
            for (const updatedObj of rootDiff.updatedObjects) {
                let text = await this.generateDiffReport(
                    updatedObj,
                    indents + 4
                );
                report.push(text);
            }
        }
        return report.join("\n");
    }

    public async generateDiffReportFlat(rootDiff: ObjectDiff): Promise<string> {
        let report: string[] = [];
        let padding = "    ";
        let objectDiff: ObjectDiff[] = flattenObjectDiff(rootDiff);
        let updatedObjects: ObjectDiff[] = objectDiff.filter(
            (item) => item.attributeDiff.length
        );
        if (updatedObjects.length) {
            report.push("Updated objects:");
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
            linkCurrent = linkCurrent ? "  " + linkCurrent : "";
            report.push(
                `\n${updatedObj.prevObject.type}: ${updatedObj.prevObject.identifier?.name}`
            );
            report.push("Prev:" + linkPrev);
            report.push("Current:" + linkCurrent);
            report.push("Updated Attributes:");
            for (const attrDiff of updatedObj.attributeDiff) {
                let linkPrev = attrDiff.prevAttr
                    ? await this.getLink(
                          attrDiff.prevAttr,
                          updatedObj.prevObject.uri
                      )
                    : "";
                linkPrev = linkPrev ? "  " + linkPrev : "";
                let linkCurrent = attrDiff.prevAttr
                    ? await this.getLink(
                          attrDiff.prevAttr,
                          updatedObj.prevObject.uri
                      )
                    : "";
                linkCurrent = linkCurrent ? "  " + linkCurrent : "";
                report.push(padding + `${attrDiff.name}`);
                report.push(
                    padding.repeat(2) +
                        "Prev Value: " +
                        `${attrDiff.prevValue}` +
                        linkPrev
                );
                report.push(
                    padding.repeat(2) +
                        "Current Value: " +
                        `${attrDiff.currentValue}` +
                        linkCurrent
                );
            }
        }
        let addedObjects: SepticObject[] = [];
        objectDiff.forEach((item) => addedObjects.push(...item.addedObjects));
        if (addedObjects.length) {
            report.push("\nAdded objects:\n");
        }
        for (const addedObj of addedObjects) {
            let link = await this.getLink(addedObj, addedObj.uri);
            link = link ? "  " + link : "";
            report.push(`${addedObj.type}: ${addedObj.identifier?.id}` + link);
        }
        let removedObjects: SepticObject[] = [];
        objectDiff.forEach((item) =>
            removedObjects.push(...item.removedObjects)
        );
        if (removedObjects.length) {
            report.push("\nRemoved objects:\n");
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
        let doc = await this.docProvider.getDocument(uri);
        if (!doc) {
            return "";
        }
        return `${uri}#${doc.positionAt(element.start).line + 1}`;
    }
}

export function compareObjects(
    prevObj: SepticObject,
    currentObj: SepticObject
): ObjectDiff {
    let removedObjects: SepticObject[] = [];
    let updatedObjects: ObjectDiff[] = [];
    let attributeDiff: AttributeDiff[] = compareAttributes(prevObj, currentObj);
    let currentMatchedChildren: SepticObject[] = [];
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
        let objectDiff = compareObjects(prevChild, currentChild);
        if (!isNoDiff(objectDiff)) {
            updatedObjects.push(objectDiff);
        }
    }
    let addedObjects: SepticObject[] = currentObj.children.filter(
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

const ignoredAttributes: string[] = ["Text1", "Text2"];

export function compareAttributes(
    prevObj: SepticObject,
    currentObj: SepticObject
): AttributeDiff[] {
    let attrDiff: AttributeDiff[] = [];
    let objectDoc = SepticMetaInfoProvider.getInstance().getObjectDocumentation(
        prevObj.type
    );
    if (!objectDoc) {
        return [];
    }
    for (const attr of objectDoc.attributes) {
        if (ignoredAttributes.includes(attr.name)) {
            continue;
        }
        let prevAttr = prevObj.getAttribute(attr.name);
        let prevValue = prevAttr?.getValues() ?? attr.default;
        let currentAttr = currentObj.getAttribute(attr.name);
        let currentValue = currentAttr?.getValues() ?? attr.default;
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
    } catch (error: any) {}
    let currentExpr;
    try {
        currentExpr = parseAlg(currentAlg);
    } catch (error: any) {}
    if (!prevExpr || !currentExpr) {
        return false;
    }
    let algComparator = new AlgComparison();
    return algComparator.visit(prevExpr, currentExpr);
}

function flattenObjectDiff(objectDiff: ObjectDiff): ObjectDiff[] {
    let flatDiff: ObjectDiff[] = [];
    flatDiff.push(objectDiff);
    for (const updatedChilds of objectDiff.updatedObjects) {
        flatDiff.push(...flattenObjectDiff(updatedChilds));
    }
    return flatDiff;
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
