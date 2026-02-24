import { SepticCnfg } from "./cnfg";
import { SepticAttribute, SepticObject, SepticTokenType } from "./elements";
import { createAttrValues, SepticObjectGenerator } from "./generator";

// Type mappings between UA and Sopc object types
const UA_TO_SOPC_TYPE_MAP: Record<string, string> = {
    UACvr: "SopcCvr",
    UAMvr: "SopcMvr",
    UAEvr: "SopcEvr",
    UATvr: "SopcTvr",
    UADvr: "SopcDvr",
};

const SOPC_TO_UA_TYPE_MAP: Record<string, string> = {
    SopcCvr: "UACvr",
    SopcMvr: "UAMvr",
    SopcEvr: "UAEvr",
    SopcTvr: "UATvr",
    SopcDvr: "UADvr",
};

// Attribute mappings for each object type pair
const UA_TO_SOPC_ATTR_MAP: Record<string, Record<string, string>> = {
    UAProcToSopcProc: {
        yPulse: "PulsTag",
        xSchedule: "ScheduleTag",
    },
    UAApplToSopcProc: {
        xAllowActive: "AllowActiveTag",
        xDesiredMode: "DesModeTag",
        yStatus: "StatusTag",
    },
    UACvr: {
        xMeas: "MeasTag",
        xNotValid: "NotValidTag",
        xDesiredActive: "CvSwitchTag",
        yActive: "CvActiveTag",
        xSetpoint: "SpTag",
        xHighLimit: "HiTag",
        xLowLimit: "LoTag",
        ySetpoint: "CvSetpointTag",
        yHighLimit: "CvHighTag",
        yLowLimit: "CvLowTag",
    },
    UAMvr: {
        xMeas: "MeasTag",
        xNotValid: "NotValidTag",
        xProcessValue: "PVTag",
        yCalcSetpoint: "SpCalcTag",
        xDesiredActive: "MvSwitchTag",
        yActive: "MvActiveTag",
        xAuto: "AutoTag",
        xExtern: "CompTag",
        xIdealValue: "IvTag",
        xHighLimit: "HiTag",
        xLowLimit: "LoTag",
        yIdealValue: "MvIvTag",
        yHighLimit: "MvHighTag",
        yLowLimit: "MvLowTag",
        xMaxMoveUp: "MaxUpTag",
        xMaxMoveDown: "MaxDownTag",
        xWindupHigh: "WhiTag",
        xWindupLow: "WloTag",
        yToComp: "ToCompTag",
        yToLocal: "ToLocalTag",
    },
    UAEvr: {
        yMeas: "MeasTag",
        yNotValid: "NotValidTag",
    },
    UATvr: {
        xMeas: "MeasTag",
        xNotValid: "NotValidTag",
    },
    UADvr: {
        xMeas: "MeasTag",
        xNotValid: "NotValidTag",
        xDesiredTracking: "DvSwitchTag",
        yTracking: "DvTrackTag",
    },
};

const SOPC_TO_UA_ATTR_MAP: Record<string, Record<string, string>> = {
    SopcProcToUAProc: {
        PulsTag: "yPulse",
        ScheduleTag: "xSchedule",
    },
    SopcProcToUAAppl: {
        AllowActiveTag: "xAllowActive",
        DesModeTag: "xDesiredMode",
        StatusTag: "yStatus",
    },

    SopcCvr: {
        MeasTag: "xMeas",
        NotValidTag: "xNotValid",
        SpTag: "xSetpoint",
        CvLowTag: "yLowLimit",
        CvHighTag: "yHighLimit",
        CvSetpointTag: "ySetpoint",
        CvSwitchTag: "xDesiredActive",
        CvActiveTag: "yActive",
        LoTag: "xLowLimit",
        HiTag: "xHighLimit",
    },
    SopcMvr: {
        MeasTag: "xMeas",
        PVTag: "xProcessValue",
        NotValidTag: "xNotValid",
        SpCalcTag: "yCalcSetpoint",
        HiTag: "xHighLimit",
        LoTag: "xLowLimit",
        IvTag: "xIdealValue",
        MvLowTag: "yLowLimit",
        MvHighTag: "yHighLimit",
        MvIvTag: "yIdealValue",
        MaxUpTag: "xMaxMoveUp",
        MaxDownTag: "xMaxMoveDown",
        AutoTag: "xAuto",
        WhiTag: "xWindupHigh",
        WloTag: "xWindupLow",
        CompTag: "xExtern",
        ToCompTag: "yToComp",
        ToLocalTag: "yToLocal",
        MvActiveTag: "yActive",
        MvSwitchTag: "xDesiredActive",
    },
    SopcEvr: {
        MeasTag: "yMeas",
        NotValidTag: "yNotValid",
    },
    SopcTvr: {
        MeasTag: "xMeas",
        NotValidTag: "xNotValid",
    },
    SopcDvr: {
        MeasTag: "xMeas",
        NotValidTag: "xNotValid",
        DvSwitchTag: "xDesiredTracking",
        DvTrackTag: "yTracking",
    },
};
export function sopcToUA(obj: SepticObject): SepticObject {
    const uaType = SOPC_TO_UA_TYPE_MAP[obj.type];
    if (!uaType) {
        throw new Error(`Unknown Sopc type: ${obj.type}`);
    }
    const generator = new SepticObjectGenerator();
    const uaObj = generator.createObject(uaType, obj.identifier?.name || "");
    const attrMap = SOPC_TO_UA_ATTR_MAP[obj.type] || {};

    // Convert attributes
    for (const attr of obj.attributes) {
        const uaAttrName = attrMap[attr.key];
        if (uaAttrName) {
            const value = getUAValue(attr);
            uaObj
                .getAttribute(uaAttrName)
                ?.setValues(
                    createAttrValues(
                        [value.length ? `"s=${value}"` : `""`],
                        SepticTokenType.string,
                    ),
                );
        }
    }
    return uaObj;
}

function getUAValue(attr: SepticAttribute): string {
    const value = attr.getFirstValue() || "";
    if (
        value.toLowerCase() === "dummy_tag" ||
        value.toLowerCase() === "notused"
    ) {
        return "";
    }
    return value;
}
/**
 * Converts a UA object to a Sopc object
 * @param obj The UA object to convert
 * @returns A new Sopc object with mapped attributes
 */
export function uaToSopc(obj: SepticObject): SepticObject {
    const sopcType = UA_TO_SOPC_TYPE_MAP[obj.type];
    if (!sopcType) {
        throw new Error(`Unknown UA type: ${obj.type}`);
    }

    const objectGenerator = new SepticObjectGenerator();

    const sopcObj = objectGenerator.createObject(
        sopcType,
        obj.identifier?.name || "",
    );
    const attrMap = UA_TO_SOPC_ATTR_MAP[obj.type] || {};
    for (const attr of obj.attributes) {
        const sopcAttrName = attrMap[attr.key];
        if (sopcAttrName) {
            sopcObj
                .getAttribute(sopcAttrName)
                ?.setValues(
                    createAttrValues(
                        [attr.values[0]?.value.replace("s=", "") || ""],
                        SepticTokenType.string,
                    ),
                );
        }
    }
    return sopcObj;
}

function sopcToUAProcAndAppl(sopcProc: SepticObject): SepticObject[] {
    const generator = new SepticObjectGenerator();
    const uaProc = generator.createObject(
        "UAProc",
        sopcProc.identifier?.name || "",
    );
    const uaAppl = generator.createObject(
        "UAAppl",
        sopcProc.identifier?.name || "",
    );

    const attrsMapUAProc = SOPC_TO_UA_ATTR_MAP["SopcProcToUAProc"] || {};
    const attrsMapUAAppl = SOPC_TO_UA_ATTR_MAP["SopcProcToUAAppl"] || {};
    for (const attr of sopcProc.attributes) {
        const uaProcAttr = attrsMapUAProc[attr.key];
        const value = getUAValue(attr);
        if (uaProcAttr) {
            uaProc
                .getAttribute(uaProcAttr)
                ?.setValues(
                    createAttrValues(
                        [value.length ? `"s=${value}"` : `""`],
                        SepticTokenType.string,
                    ),
                );
        }
        const uaApplAttr = attrsMapUAAppl[attr.key];
        if (uaApplAttr) {
            uaAppl
                .getAttribute(uaApplAttr)
                ?.setValues(
                    createAttrValues(
                        [value.length ? `"s=${value}"` : `""`],
                        SepticTokenType.string,
                    ),
                );
        }
    }
    return [uaProc, uaAppl];
}

function uaProcAndApplToSopc(
    uaProc: SepticObject,
    uaAppl: SepticObject,
): SepticObject | undefined {
    const generator = new SepticObjectGenerator();
    const sopcProc = generator.createObject(
        "SopcProc",
        uaAppl.identifier?.name || "",
        [
            {
                key: "ServName",
                type: SepticTokenType.string,
                values: ['"Statoil.OPC.Server"'],
            },
            {
                key: "Site",
                type: SepticTokenType.string,
                values: ["AIM_AIMGUI"],
            },
        ],
    );

    const attrsMapUAProc = UA_TO_SOPC_ATTR_MAP["UAProcToSopcProc"] || {};
    const attrsMapUAAppl = UA_TO_SOPC_ATTR_MAP["UAApplToSopcProc"] || {};
    for (const attr of uaProc.attributes) {
        const sopcAttr = attrsMapUAProc[attr.key];
        if (sopcAttr) {
            sopcProc
                .getAttribute(sopcAttr)
                ?.setValues(
                    createAttrValues(
                        [attr.values[0]?.value.replace("s=", "") || ""],
                        SepticTokenType.string,
                    ),
                );
        }
    }
    for (const attr of uaAppl.attributes) {
        const sopcAttr = attrsMapUAAppl[attr.key];
        if (sopcAttr) {
            sopcProc
                .getAttribute(sopcAttr)
                ?.setValues(
                    createAttrValues(
                        [attr.values[0]?.value.replace("s=", "") || ""],
                        SepticTokenType.string,
                    ),
                );
        }
    }
    return sopcProc;
}

export function convertOPCObjects(
    cnfg: SepticCnfg,
    direction: "sopc-to-ua" | "ua-to-sopc",
): SepticCnfg {
    const typeMap =
        direction === "sopc-to-ua" ? SOPC_TO_UA_TYPE_MAP : UA_TO_SOPC_TYPE_MAP;
    const convertFn = direction === "sopc-to-ua" ? sopcToUA : uaToSopc;
    for (let i = 0; i < cnfg.objects.length; i++) {
        const obj = cnfg.objects[i]!;
        if (obj.type == "SopcProc" && direction === "sopc-to-ua") {
            const uaObjects = sopcToUAProcAndAppl(obj);
            cnfg.objects.splice(i, 1, ...uaObjects);
            i += uaObjects.length - 1;
            continue;
        }
        if (obj.type == "UAProc" && direction === "ua-to-sopc") {
            const sopcProc = uaProcAndApplToSopc(obj, cnfg.objects[i + 1]!);
            if (sopcProc) {
                cnfg.objects.splice(i, 2, sopcProc);
            }
        }
        if (typeMap[obj.type]) {
            cnfg.objects[i] = convertFn(obj);
        }
    }
    return cnfg;
}
