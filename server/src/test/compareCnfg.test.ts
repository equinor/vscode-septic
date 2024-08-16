import { expect } from "chai";
import {
    compareAlg,
    compareAttributes,
    compareObjects,
    ComparisonSettings,
    isNoDiff,
} from "../language-service/cnfgComparisonProvider";
import { parseSepticSync, SepticMetaInfoProvider } from "../septic";

const settings: ComparisonSettings = {
    ignoredAttributes: [],
    ignoredObjectTypes: [],
    ignoredVariables: [],
};

describe("Test compare attributes", () => {
    it("Expect no difference for identical objects", () => {
        let prevText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;
        let currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(0);
    });
    it("Expect difference for non identical objects", () => {
        let prevText: string = `
            Cvr: Prev
            Fulf= 2 
            BiasTFilt= 1`;
        let currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
    it("Expect no difference for missing attribute with default value", () => {
        let prevText: string = `
            Cvr: Prev
            BiasTFilt= 1`;
        let currentText: string = `
            Cvr: Prev
            Fulf= 1 
            BiasTFilt= 1`;

        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(0);
    });
    it("Expect difference for missing attribute with non default value", () => {
        let prevText: string = `
            Cvr: Prev
            BiasTFilt= 1`;
        let currentText: string = `
            Cvr: Prev
            Fulf= 2 
            BiasTFilt= 1`;

        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
    it("Expect no difference for diff in ignored attribute", () => {
        let prevText: string = `
            Cvr: Prev
			Text1= "Prev"
            BiasTFilt= 1`;
        let currentText: string = `
            Cvr: Prev
			Text1= "Current"
            Fulf= 2 
            BiasTFilt= 1`;

        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareAttributes(prevObject, currentObject, undefined);
        expect(diff.length).to.equal(1);
        expect(diff[0].name).to.equal("Fulf");
    });
});

describe("Test alg comparison", () => {
    it("Expect no difference for identical binary expr", () => {
        let prevAlg = "1+2";
        let currentAlg = "1+2";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect difference for non-identical binary expr", () => {
        let prevAlg = "1+2";
        let currentAlg = "2+2";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(false);
    });
    it("Expect no difference for identical algs with extra white space", () => {
        let prevAlg = "1+  2";
        let currentAlg = "1+2";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect no difference for binary expr with commutative operator", () => {
        let prevAlg = "2+1";
        let currentAlg = "1+2";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect no difference for identical calcs", () => {
        let prevAlg = "if(1 > 2, 1, 2)";
        let currentAlg = "if(1>2, 1,  2)";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(true);
    });
    it("Expect difference for non identical calcs", () => {
        let prevAlg = "if(1 > 2, 2, 1)";
        let currentAlg = "if(1>2, 1,  2)";
        let result = compareAlg(prevAlg, currentAlg);
        expect(result).to.equal(false);
    });
});

describe("Test compare objects", () => {
    it("Expect no difference between identical objects", () => {
        let prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        let currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        let noDiff = isNoDiff(diff);
        expect(noDiff).to.equal(true);
    });
    it("Expect no difference between identical objects with identical children", () => {
        let prevText: string = `
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
        let currentText: string = `
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
        let prevCnfg = parseSepticSync(prevText);
        prevCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let prevObject = prevCnfg.objects[0];
        let currentCnfg = parseSepticSync(currentText);
        currentCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let currentObject = currentCnfg.objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        let noDiff = isNoDiff(diff);
        expect(noDiff).to.equal(true);
    });
    it("Expect difference between objects with different attributes", () => {
        let prevText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 1
		DesMode= ACTIVE
		`;
        let currentText: string = `
		DmmyAppl: Prev
		Text1= "Prev"
		Nstep= 2
		DesMode= ACTIVE
		`;
        let prevObject = parseSepticSync(prevText).objects[0];
        let currentObject = parseSepticSync(currentText).objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.attributeDiff.length).to.equal(1);
    });
    it("Expect difference between identical objects with non-identical children", () => {
        let prevText: string = `
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
        let currentText: string = `
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
        let prevCnfg = parseSepticSync(prevText);
        prevCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let prevObject = prevCnfg.objects[0];
        let currentCnfg = parseSepticSync(currentText);
        currentCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let currentObject = currentCnfg.objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.updatedObjects.length).to.equal(1);
    });
    it("Expect difference between identical objects with added child", () => {
        let prevText: string = `
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
        let currentText: string = `
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
        let prevCnfg = parseSepticSync(prevText);
        prevCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let prevObject = prevCnfg.objects[0];
        let currentCnfg = parseSepticSync(currentText);
        currentCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let currentObject = currentCnfg.objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.addedObjects.length).to.equal(1);
    });
    it("Expect difference between identical objects with removed child", () => {
        let prevText: string = `
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
        let currentText: string = `
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
        let prevCnfg = parseSepticSync(prevText);
        prevCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let prevObject = prevCnfg.objects[0];
        let currentCnfg = parseSepticSync(currentText);
        currentCnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
        let currentObject = currentCnfg.objects[0];
        let diff = compareObjects(prevObject, currentObject, settings);
        expect(diff.removedObjects.length).to.equal(1);
    });
});
