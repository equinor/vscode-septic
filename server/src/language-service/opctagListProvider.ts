import { SepticReferenceProvider } from "../septic";

export class OpcTagListProvider {
    constructor() {}

    public generateOpcTagList(refProvider: SepticReferenceProvider): string {
        return "";
    }
}

export function generateOpcReport(
    refProvider: SepticReferenceProvider
): string {
    let header: string = "ObjectId;ObjectType;ObjectAttribute;OPCTag";
    let entries: string[] = [];
    let opcObjects = refProvider.getObjectsByType(
        "SopcTvr",
        "SopcEvr",
        "SopcCvr",
        "SopcDvr",
        "SopcMvr",
        "SopcProc",
        "SopcSampleTvr",
        "SopcChangeEvr",
        "SopcAsyncEvr",
        "SopcTimeTvr",
        "SopcTextTvr",
        "SopcSvr"
    );
    for (let obj of opcObjects) {
        let objectName = obj.identifier?.id ?? "unknown";
        let tagAttributes = obj.attributes.filter((attr) =>
            attr.key.endsWith("Tag")
        );
        for (let tagAttr of tagAttributes) {
            let value = tagAttr.getAttrValue()?.getValue() ?? "";
            if (
                value.trim() === "" ||
                value === "DUMMY_TAG" ||
                value === "NotUsed"
            ) {
                continue;
            }
            entries.push(`${objectName};${obj.type};${tagAttr.key};${value}`);
        }
    }
    return [header, ...entries].join("\n");
}
