import { expect } from 'chai';
import { parseSepticSync, SepticMetaInfoProvider } from '../septic';
import { MockDocument } from './util';

SepticMetaInfoProvider.setVersion("v3.0");

describe("SepticFunction", () => {
	it("Expect only a single function without input", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1+2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Text2= "#test"
				Alg= "A * B"

			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		const functions = cnfg.getFunctions();
		expect(functions.length).to.equal(1);
		expect(functions[0].lines.length).to.equal(3);
		expect(functions[0].inputs.length).to.equal(0);
	});
	it("Expect only a single function with a single input", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1 + 2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Text2= "#test"
				Alg= "A * B + D"
			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		const functions = cnfg.getFunctions();
		expect(functions.length).to.equal(1);
		expect(functions[0].lines.length).to.equal(3);
		expect(functions[0].inputs.length).to.equal(1);
	});
	it("Expect two functions", async () => {
		const text = `
				CalcModl:  Test

				CalcPvr:  A
				Alg= "1+2"

				CalcPvr:  B
				Alg=  "A + 1"

				CalcPvr: C
				Text2= "#test1"
				Alg= "A * B"

				CalcPvr: D
				Text2= "#test2"
				Alg= "B + 1"
			`;
		const doc = new MockDocument(text);
		const cnfg = parseSepticSync(doc.getText());
		const functions = cnfg.getFunctions();
		expect(functions.length).to.equal(2);

	});

});
