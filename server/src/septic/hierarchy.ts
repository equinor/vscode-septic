import { SepticObject } from "./septicElements";
import { SepticObjectHierarchy } from "./septicMetaInfo";

interface ObjectNode {
    obj: SepticObject;
    parent: ObjectNode | undefined;
    level: number;
}

export function updateParentObjects(
    objects: SepticObject[],
    objectHierarchy: SepticObjectHierarchy
) {
    const root: ObjectNode = {
        obj: new SepticObject("", undefined),
        parent: undefined,
        level: -1,
    };

    let parent;
    for (let obj of objects) {
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
    objectHierarchy: SepticObjectHierarchy
): ObjectNode {
    let node: ObjectNode = {
        obj: obj,
        parent: undefined,
        level: objectHierarchy.nodes.get(obj.type)?.level ?? -1,
    };
    while (parent && node.level <= parent.level) {
        parent = parent.parent;
    }
    node.parent = parent;
    node.obj.setParent(parent?.obj);
    return node;
}