import { SepticObject } from "./elements";
import {
    SepticMetaInfoProvider,
    SepticObjectHierarchy,
} from "./metaInfoProvider";

interface ObjectNode {
    obj: SepticObject;
    parent: ObjectNode | undefined;
    level: number;
}

export function updateParentObjects(objects: SepticObject[]) {
    const objectHierarchy =
        SepticMetaInfoProvider.getInstance().getObjectHierarchy();
    objects.forEach((obj) => {
        obj.resetChildren();
        obj.resetParent();
    });
    const root: ObjectNode = {
        obj: new SepticObject("", undefined),
        parent: undefined,
        level: -1,
    };

    let parent;
    for (const obj of objects) {
        if (!parent) {
            parent = updateParent(root, obj, objectHierarchy);
        } else {
            parent = updateParent(parent, obj, objectHierarchy);
        }
    }
}

function updateParent(
    parent: ObjectNode | undefined,
    obj: SepticObject,
    objectHierarchy: SepticObjectHierarchy,
): ObjectNode {
    const node: ObjectNode = {
        obj: obj,
        parent: undefined,
        level: objectHierarchy.nodes.get(obj.type)?.level ?? 100,
    };
    while (parent && node.level <= parent.level) {
        parent = parent.parent;
    }
    node.parent = parent;
    if (parent?.obj.type === "") {
        return node;
    }
    node.obj.setParent(parent?.obj);
    parent?.obj.addChild(node.obj);
    return node;
}
