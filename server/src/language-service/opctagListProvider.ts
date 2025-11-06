/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SepticContext } from "../septic";

export function generateOpcReport(
    contextProvider: SepticContext
): string {
    const header: string = "ObjectId;ObjectType;ObjectAttribute;OPCTag";
    const entries: string[] = [];
    const opcObjects = contextProvider.getObjectsByType(
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
        "SopcSvr",
        "UATvr",
        "UAEvr",
        "UACvr",
        "UADvr",
        "UAMvr",
        "UAAppl",
        "UAProc"
    );
    for (const obj of opcObjects) {
        const objectName = obj.identifier?.id ?? "unknown";
        const tagAttributes = obj.attributes.filter(
            (attr) =>
                attr.key.endsWith("Tag") ||
                attr.key.startsWith("x") ||
                attr.key.startsWith("y")
        );
        for (const tagAttr of tagAttributes) {
            const value = tagAttr.getAttrValue()?.getValue() ?? "";
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
