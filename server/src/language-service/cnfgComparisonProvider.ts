import { DocumentProvider } from "../documentProvider";
import {
    Attribute,
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
        let report = await this.generateDiffReport(rootObjectDiff);
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
    let diff: AttributeDiff[] = [];
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
        if (prevValue.toString() !== currentValue.toString()) {
            diff.push({
                name: attr.name,
                prevAttr: prevAttr,
                prevValue: prevValue,
                currentAttr: currentAttr,
                currentValue: currentValue,
            });
        }
    }
    return diff;
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
