import { expect } from 'chai';
import { parseSepticSync, SepticMetaInfoProvider } from '../septic';
import { MockDocument } from './util';
import { printFunctionInfo } from '../septic';

SepticMetaInfoProvider.setVersion("v3.0");

describe("SepticFunction", () => {
	it("Expect only a single root function without input", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1+2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Alg= "A * B"
			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		await cnfg.updateObjectParents(SepticMetaInfoProvider.getInstance().getObjectHierarchy());
		const functions = cnfg.getRootFunctions();
		expect(functions.length).to.equal(1);
		expect(functions[0].lines.length).to.equal(3);
		expect(functions[0].inputs.length).to.equal(0);
	});
	it("Expect only a single root function with a single input", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1 + 2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Alg= "A * B + D"
			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		await cnfg.updateObjectParents(SepticMetaInfoProvider.getInstance().getObjectHierarchy());
		const functions = cnfg.getRootFunctions();
		expect(functions.length).to.equal(1);
		expect(functions[0].lines.length).to.equal(3);
		expect(functions[0].inputs.length).to.equal(1);
	});
	it("Expect finding both root functions", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1+2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Alg= "A * B"

				CalcPvr: D
				Alg= "B + 1"
			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		await cnfg.updateObjectParents(SepticMetaInfoProvider.getInstance().getObjectHierarchy());
		const functions = cnfg.getRootFunctions();
		printFunctionInfo(functions[0]);
		expect(functions.length).to.equal(2);

	});

});
