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
const UA_TO_SOPC_ATTR_MAP: Record<string, Record<string, string | string[]>> = {
    UAProcToSopcProc: {
        yPulse: "PulsTag",
        xSchedule: "ScheduleTag",
    },
    UAApplToSopcProc: {
        xAllowActive: "AllowActiveTag",
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

const SOPC_TO_UA_ATTR_MAP: Record<string, Record<string, string | string[]>> = {
    SopcProcToUAProc: {
        PulsTag: "yPulse",
        ScheduleTag: "xSchedule",
    },
    SopcProcToUAAppl: {
        AllowActiveTag: ["xAllowActive", "xDesiredMode"],
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
        CompTag: ["xExtern", "xDesiredActive"],
        ToCompTag: "yToComp",
        ToLocalTag: "yToLocal",
        MvActiveTag: "yActive",
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
            const uaAttrNames = Array.isArray(uaAttrName)
                ? uaAttrName
                : [uaAttrName];
            for (const name of uaAttrNames) {
                uaObj
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [value.length ? `"s=${value}"` : `""`],
                            SepticTokenType.string,
                        ),
                    );
            }
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

function getSopcValue(attr: SepticAttribute): string {
    return attr.getFirstValue()?.replace("s=", "") || "";
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
            const sopcAttrNames = Array.isArray(sopcAttrName)
                ? sopcAttrName
                : [sopcAttrName];
            for (const name of sopcAttrNames) {
                const value = getSopcValue(attr);
                if (value === "") {
                    continue;
                }
                sopcObj
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [`"${value}"`],
                            SepticTokenType.string,
                        ),
                    );
            }
        }
    }
    return sopcObj;
}

function sopcToUAProcAndAppl(
    sopcProc: SepticObject,
    simulator: boolean = false,
): SepticObject[] {
    const generator = new SepticObjectGenerator();
    const attributes = [
        {
            key: "DefaultNameSpaceURI",
            type: SepticTokenType.string,
            values: ['"urn:equinor:MiniOpcUaServer"'],
        },
        {
            key: "SecurityMode",
            type: SepticTokenType.identifier,
            values: ["UA_MESSAGESECURITYMODE_NONE"],
        },
    ];
    if (simulator) {
        attributes.push({
            key: "RunMenu",
            type: SepticTokenType.identifier,
            values: ["ON"],
        });
    }
    const uaProc = generator.createObject(
        "UAProc",
        sopcProc.identifier?.name || "",
        attributes,
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
            const uaProcAttrNames = Array.isArray(uaProcAttr)
                ? uaProcAttr
                : [uaProcAttr];
            for (const name of uaProcAttrNames) {
                uaProc
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [value.length ? `"s=${value}"` : `""`],
                            SepticTokenType.string,
                        ),
                    );
            }
        }
        const uaApplAttr = attrsMapUAAppl[attr.key];
        if (uaApplAttr) {
            const uaApplAttrNames = Array.isArray(uaApplAttr)
                ? uaApplAttr
                : [uaApplAttr];
            for (const name of uaApplAttrNames) {
                uaAppl
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [value.length ? `"s=${value}"` : `""`],
                            SepticTokenType.string,
                        ),
                    );
            }
        }
    }
    if (simulator) {
        return [uaProc];
    }
    return [uaProc, uaAppl];
}

function uaProcAndApplToSopc(
    uaProc: SepticObject,
    uaAppl: SepticObject | undefined,
    simulator: boolean = false,
): SepticObject | undefined {
    const generator = new SepticObjectGenerator();
    const sopcProc = generator.createObject(
        "SopcProc",
        uaAppl?.identifier?.name || uaProc.identifier?.name || "",
        [
            {
                key: "ServName",
                type: SepticTokenType.string,
                values: ['"Statoil.OPC.Server"'],
            },
            {
                key: "Site",
                type: SepticTokenType.identifier,
                values: [simulator ? "OPCSIMUL" : "AIM_AIMGUI"],
            },
        ],
    );

    const attrsMapUAProc = UA_TO_SOPC_ATTR_MAP["UAProcToSopcProc"] || {};
    const attrsMapUAAppl = UA_TO_SOPC_ATTR_MAP["UAApplToSopcProc"] || {};
    for (const attr of uaProc.attributes) {
        const sopcAttr = attrsMapUAProc[attr.key];
        if (sopcAttr) {
            const sopcAttrNames = Array.isArray(sopcAttr)
                ? sopcAttr
                : [sopcAttr];
            for (const name of sopcAttrNames) {
                const value = getSopcValue(attr);
                if (value === "") {
                    continue;
                }
                sopcProc
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [`"${value}"`],
                            SepticTokenType.string,
                        ),
                    );
            }
        }
    }
    if (!uaAppl) {
        return sopcProc;
    }
    for (const attr of uaAppl.attributes) {
        const sopcAttr = attrsMapUAAppl[attr.key];
        if (sopcAttr) {
            const sopcAttrNames = Array.isArray(sopcAttr)
                ? sopcAttr
                : [sopcAttr];
            for (const name of sopcAttrNames) {
                sopcProc
                    .getAttribute(name)
                    ?.setValues(
                        createAttrValues(
                            [attr.values[0]?.value.replace("s=", "") || ""],
                            SepticTokenType.string,
                        ),
                    );
            }
        }
    }
    return sopcProc;
}

export function convertOPCObjects(
    cnfg: SepticCnfg,
    direction: "sopc-to-ua" | "ua-to-sopc",
    simulator: boolean = false,
): SepticCnfg {
    const typeMap =
        direction === "sopc-to-ua" ? SOPC_TO_UA_TYPE_MAP : UA_TO_SOPC_TYPE_MAP;
    const convertFn = direction === "sopc-to-ua" ? sopcToUA : uaToSopc;
    for (let i = 0; i < cnfg.objects.length; i++) {
        const obj = cnfg.objects[i]!;
        if (obj.type == "SopcProc" && direction === "sopc-to-ua") {
            const uaObjects = sopcToUAProcAndAppl(obj, simulator);
            cnfg.objects.splice(i, 1, ...uaObjects);
            i += uaObjects.length - 1;
            continue;
        }
        if (obj.type == "UAProc" && direction === "ua-to-sopc") {
            const uaAppls = cnfg.getObjectsByType("UAAppl");
            const sopcProc = uaProcAndApplToSopc(
                obj,
                uaAppls.length ? uaAppls[0] : undefined,
                simulator,
            );
            if (sopcProc) {
                cnfg.objects.splice(i, uaAppls.length ? 2 : 1, sopcProc);
            }
        }
        if (typeMap[obj.type]) {
            cnfg.objects[i] = convertFn(obj);
        }
    }
    return cnfg;
}
