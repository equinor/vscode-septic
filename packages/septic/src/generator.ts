import {
    SepticAttribute,
    SepticAttributeValue,
    SepticIdentifier,
    SepticObject,
    SepticTokenType,
} from "./elements";
import { SepticMetaInfoProvider, SepticObjectDoc } from "./metaInfoProvider";

export class SepticObjectGenerator {
    private metaInfoProvider: SepticMetaInfoProvider;
    constructor() {
        this.metaInfoProvider = SepticMetaInfoProvider.getInstance();
    }

    public createObject(
        type: string,
        identifier: string,
        attributes: {
            key: string;
            type: SepticTokenType;
            values: string[];
        }[] = [],
    ): SepticObject {
        const objectDoc = this.metaInfoProvider.getObjectDocumentation(type);
        if (!objectDoc) {
            throw new Error(`Unknown object type: ${type}`);
        }
        const obj = objectDocToObject(identifier, objectDoc);
        for (const attr of attributes) {
            const attribute = obj.getAttribute(attr.key);
            if (attribute) {
                attribute.setValues(createAttrValues(attr.values, attr.type));
            }
        }
        return obj;
    }
}

function objectDocToObject(
    identifier: string,
    doc: SepticObjectDoc,
): SepticObject {
    const obj = new SepticObject(doc.name, new SepticIdentifier(identifier));
    for (const attrDoc of doc.attributes) {
        if (attrDoc.noCnfg) {
            continue;
        }
        const attr = new SepticAttribute(attrDoc.name);
        const tokenType =
            attrDoc.dataType == "string"
                ? SepticTokenType.string
                : SepticTokenType.numeric;
        const attrValues = createAttrValues(attrDoc.default, tokenType);
        attr.setValues(attrValues);
        obj.addAttribute(attr);
    }
    return obj;
}

export function createAttrValues(
    values: string[],
    type: SepticTokenType,
): SepticAttributeValue[] {
    const attrValues: SepticAttributeValue[] = [];
    if (values.length > 1) {
        attrValues.push(
            new SepticAttributeValue(
                `${values.length}`,
                SepticTokenType.numeric,
            ),
        );
    }
    values.forEach((val) => {
        attrValues.push(new SepticAttributeValue(val, type));
    });
    return attrValues;
}
