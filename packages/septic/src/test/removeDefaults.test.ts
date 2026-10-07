import { expect } from "chai";
import { removeDefaultLines, ObjectDocProvider } from "../removeDefaults";
import {
    ISepticObjectDocumentation,
    SepticAttributeDocumentation,
    SepticObjectDoc,
} from "../metaInfoProvider";
import { parseSepticForTest } from "./util";

function makeAttrDoc(
    name: string,
    defaults: string[],
): SepticAttributeDocumentation {
    return {
        name,
        default: defaults,
        description: "",
        dataType: "string",
        enums: [],
        list: false,
        tags: [],
        calc: false,
        basename: name,
        noCnfg: false,
        snippet: "",
        noSnippet: false,
    };
}

function makeObjDoc(
    name: string,
    attrs: SepticAttributeDocumentation[],
): ISepticObjectDocumentation {
    const attrMap = new Map(attrs.map((a) => [a.name, a]));
    return {
        name,
        attributes: attrs,
        description: "",
        parents: [],
        publicAttributes: [],
        getAttribute(attr: string) {
            return attrMap.get(attr);
        },
        getObjectDoc(): SepticObjectDoc {
            return {
                name,
                attributes: attrs,
                description: "",
                parents: [],
                publicAttributes: [],
            };
        },
    };
}

const mockProvider: ObjectDocProvider = {
    getObjectDocumentation(objectType: string) {
        if (objectType === "Cvr") {
            return makeObjDoc("Cvr", [
                makeAttrDoc("Text1", ['""']),
                makeAttrDoc("Text2", ['""']),
                makeAttrDoc("Mode", ["STOPPED"]),
                makeAttrDoc("Auto", ["OFF"]),
                makeAttrDoc("PlotMax", ["100"]),
                makeAttrDoc("PlotMin", ["0"]),
                makeAttrDoc("Fulf", ["1"]),
            ]);
        }
        return undefined;
    },
};

describe("removeDefaultLines", () => {
    it("should remove attributes set to default values", () => {
        const text = `  Cvr:           TestCvr
         Text1=  ""
         Text2=  ""
          Mode=  STOPPED
          Auto=  OFF
       PlotMax=  100
       PlotMin=  0
          Fulf=  5`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.contain("Fulf=  5");
        expect(result).to.contain("Cvr:");
        expect(result).to.not.contain("Mode=");
        expect(result).to.not.contain("Auto=");
        expect(result).to.not.contain("PlotMax=");
        expect(result).to.not.contain("PlotMin=");
    });

    it("should keep attributes with non-default values", () => {
        const text = `  Cvr:           TestCvr
          Mode=  ACTIVE
          Auto=  ON
       PlotMax=  200`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.contain("Mode=  ACTIVE");
        expect(result).to.contain("Auto=  ON");
        expect(result).to.contain("PlotMax=  200");
    });

    it("should return text unchanged when no defaults are present", () => {
        const text = `  Cvr:           TestCvr
          Mode=  ACTIVE
          Fulf=  5`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.equal(text);
    });

    it("should handle Text1 and Text2 defaults with quotes", () => {
        const text = `  Cvr:           TestCvr
         Text1=  ""
         Text2=  "Important description"`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.not.contain("Text1=");
        expect(result).to.contain('Text2=  "Important description"');
    });

    it("should handle multiple objects", () => {
        const text = `  Cvr:           Cvr1
          Mode=  STOPPED
          Fulf=  5

  Cvr:           Cvr2
          Mode=  ACTIVE
          Auto=  OFF`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        // Cvr1: Mode removed (default), Fulf kept
        expect(result).to.contain("Fulf=  5");
        expect(result).to.not.contain("Mode=  STOPPED");
        // Cvr2: Mode kept (non-default), Auto removed (default)
        expect(result).to.contain("Mode=  ACTIVE");
        expect(result).to.not.contain("Auto=  OFF");
    });

    it("should handle object with no attributes", () => {
        const text = `  Cvr:           TestCvr`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.equal(text);
    });

    it("should handle unknown object types gracefully", () => {
        const text = `  UnknownType:   Test
          SomeAttr=  123`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        expect(result).to.equal(text);
    });

    it("should handle numeric default with different formatting", () => {
        const text = `  Cvr:           TestCvr
       PlotMax=  100.0
       PlotMin=  0`;
        const cnfg = parseSepticForTest(text);
        const result = removeDefaultLines(cnfg, mockProvider);
        // PlotMin=0 matches default '0', should be removed
        expect(result).to.not.contain("PlotMin=");
        // PlotMax=100.0 vs default '100' — different string, kept
        expect(result).to.contain("PlotMax=  100.0");
    });
});
