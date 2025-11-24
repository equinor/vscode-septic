import { expect } from "chai";
import {
    compareAlg,
    compareAttributes,
    compareObjects,
    ComparisonSettings,
    isNoDiff,
} from "../language-service/cnfgComparisonProvider";
import { SepticMetaInfoProvider } from "../septic";
import { parseSepticForTest } from "./util";

const settings: ComparisonSettings = {
    ignoredAttributes: [],
    ignoredObjectTypes: [],
    ignoredVariables: [],
};

describe("Test compare attributes", () => {
    it("Expect no difference for identical objects", () => {
        const prevText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;
        const currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(0);
    });
    it("Expect difference for non identical objects", () => {
        const prevText: string = `
            Cvr: Prev
            Fulf= 2 
            BiasTFilt= 1`;
        const currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
    it("Expect no difference for missing attribute with default value", () => {
        const prevText: string = `
            Cvr: Prev
            BiasTFilt= 1`;
        const currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(0);
    });
    it("Expect difference for missing attribute with non default value", () => {
        const prevText: string = `
            Cvr: Prev
            BiasTFilt= 1`;
        const currentText: string = `
            Cvr: Prev
            Fulf= 2 
            BiasTFilt= 1`;

        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
    it("Expect no difference for diff in ignored attribute", () => {
        const prevText: string = `
            Cvr: Prev
			Text1= "Prev"
            BiasTFilt= 1`;
        const currentText: string = `
            Cvr: Prev
			Text1= "Current"
            Fulf= 2 
            BiasTFilt= 1`;

        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
});

describe("Test alg comparison", () => {
    it("Expect no difference for identical binary expr", () => {
        const prevAlg = "1+2";
        const currentAlg = "1+2";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect difference for non-identical binary expr", () => {
        const prevAlg = "1+2";
        const currentAlg = "2+2";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(false);
    });
    it("Expect no difference for identical algs with extra white space", () => {
        const prevAlg = "1+  2";
        const currentAlg = "1+2";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect no difference for binary expr with commutative operator", () => {
        const prevAlg = "2+1";
        const currentAlg = "1+2";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect no difference for identical calcs", () => {
        const prevAlg = "if(1 > 2, 1, 2)";
        const currentAlg = "if(1>2, 1,  2)";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect difference for non identical calcs", () => {
        const prevAlg = "if(1 > 2, 2, 1)";
        const currentAlg = "if(1>2, 1,  2)";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(false);
    });
    it("Expect no difference for identical calcs", () => {
        const prevAlg = "A + 2*(A+B)";
        const currentAlg = "A + 2 * (A + B)";
        const result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
});

describe("Test compare objects", () => {
    it("Expect no difference between identical objects", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        const noDiff = isNoDiff(diff);
        expect(noDiff).to.equal(true);
    });
    it("Expect no difference between identical objects with identical children", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const prevCnfg = parseSepticForTest(prevText);
        prevCnfg.updateObjectParents();
        const prevObject = prevCnfg.objects[0];
        const currentCnfg = parseSepticForTest(currentText);
        currentCnfg.updateObjectParents();
        const currentObject = currentCnfg.objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        const noDiff = isNoDiff(diff);
        expect(noDiff).to.equal(true);
    });
    it("Expect difference between objects with different attributes", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 2
		DesMode= ACTIVE
		`;
        const prevObject = parseSepticForTest(prevText).objects[0];
        const currentObject = parseSepticForTest(currentText).objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.attributeDiff.length).to.equal(1);
    });
    it("Expect difference between identical objects with non-identical children", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  "%"
       GrpMask=  0000000000000000000000000000010
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const prevCnfg = parseSepticForTest(prevText);
        prevCnfg.updateObjectParents();
        const prevObject = prevCnfg.objects[0];
        const currentCnfg = parseSepticForTest(currentText);
        currentCnfg.updateObjectParents();
        const currentObject = currentCnfg.objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.updatedObjects.length).to.equal(1);
    });
    it("Expect difference between identical objects with added child", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 

		 Evr:           EvrName1
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000010
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const prevCnfg = parseSepticForTest(prevText);
        prevCnfg.updateObjectParents();
        const prevObject = prevCnfg.objects[0];
        const currentCnfg = parseSepticForTest(currentText);
        currentCnfg.updateObjectParents();
        const currentObject = currentCnfg.objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.addedObjects.length).to.equal(1);
    });
    it("Expect difference between identical objects with removed child", () => {
        const prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000001
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 

		Evr:           EvrName1
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000010
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE

		  Evr:           EvrName
          Nfix=  1
          Unit=  ""
       GrpMask=  0000000000000000000000000000010
       GrpType=  0000000000000000000000000000000
          Span=  10
          Meas=  0
      UserMeas=  0
      MinInput=  0
      MaxInput=  0
ValidationLimit=  -1
         Color=  BLACK 
		`;
        const prevCnfg = parseSepticForTest(prevText);
        prevCnfg.updateObjectParents();
        const prevObject = prevCnfg.objects[0];
        const currentCnfg = parseSepticForTest(currentText);
        currentCnfg.updateObjectParents();
        const currentObject = currentCnfg.objects[0];
        const diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.removedObjects.length).to.equal(1);
    });
});
