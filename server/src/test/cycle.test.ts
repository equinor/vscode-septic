import { expect } from "chai";
import { Alg, CycleDetectorVisitor, findAlgCycles, parseAlg } from "../septic";

describe("Test cycle detector visitor", () => {
    it("Expect all variables when no setgood", () => {
        const input = "Test1 + Test2";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.variables.length).to.equal(2);
        expect(cycleVisitor.nodes.length).to.equal(0);
    });
    it("Expect no variables when nested in setgood", () => {
        const input = "setgood(Test1 + Test2)";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.variables.length).to.equal(0);
        expect(cycleVisitor.nodes.length).to.equal(0);
    });
    it("Expect no variables when nested in setgood", () => {
        const input = "setgood(setbad(Test1) + setgood(Test2))";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.variables.length).to.equal(0);
        expect(cycleVisitor.nodes.length).to.equal(0);
    });
    it("Expect only non-setgood nested variables", () => {
        const input = "setbad(Test1) + setgood(Test2)";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.variables.length).to.equal(1);
        expect(cycleVisitor.variables[0].value).to.equal("Test1");
        expect(cycleVisitor.nodes.length).to.equal(0);
    });
    it("Expect no variables when using setgood in nested function", () => {
        const input = "if(setgood(Test1)>1, 1, 0)";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.variables.length).to.equal(0);
        expect(cycleVisitor.nodes.length).to.equal(0);
    });
    it("Expect nodes when setmeas is used", () => {
        const input = "setmeas(Test1, Test2)";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.nodes.length).to.equal(1);
        expect(cycleVisitor.variables.length).to.equal(1);
    });
    it("Expect nodes when setmeas is used with multiple nested expresions", () => {
        const input = "setmeas(Test1, if(Test2 > 2, Test3, Test4))";
        let expr = parseAlg(input);
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        expect(cycleVisitor.nodes.length).to.equal(1);
        expect(cycleVisitor.nodes[0].neighbors.size).to.equal(3);
        expect(cycleVisitor.variables.length).to.equal(3);
    });
});

describe("Test cycle detection", () => {
    it("Expect that self cycle is detected", () => {
        let alg1: Alg = {
            calcPvrName: "Test1",
            content: "Test1 + 1",
        };
        let cycles = findAlgCycles([alg1]);
        expect(cycles.length).to.equal(1);
        expect(cycles[0].nodes.length).to.equal(1);
    });

    it("Expect that cycle with two nodes is detected", () => {
        let alg1: Alg = {
            calcPvrName: "Test1",
            content: "Test2 + 1",
        };
        let alg2: Alg = {
            calcPvrName: "Test2",
            content: "Test1 - 1",
        };
        let cycles = findAlgCycles([alg1, alg2]);
        expect(cycles.length).to.equal(1);
        expect(cycles[0].nodes.length).to.equal(2);
    });

    it("Expect that no cycle is detected for non cyclic calcs", () => {
        let alg1: Alg = {
            calcPvrName: "Test1",
            content: "Test2 + 1",
        };
        let alg2: Alg = {
            calcPvrName: "Test2",
            content: "Test3 - 1",
        };
        let cycles = findAlgCycles([alg1, alg2]);
        expect(cycles.length).to.equal(0);
    });

    it("Expect that multiple cycles are detected", () => {
        let alg1: Alg = {
            calcPvrName: "Test1",
            content: "Test2 + 1",
        };
        let alg2: Alg = {
            calcPvrName: "Test2",
            content: "Test1 + Test3",
        };

        let alg3: Alg = {
            calcPvrName: "Test3",
            content: "Test1",
        };

        let cycles = findAlgCycles([alg1, alg2, alg3]);
        expect(cycles.length).to.equal(2);
        expect(cycles[0].nodes.length).to.equal(2);
        expect(cycles[1].nodes.length).to.equal(3);
    });

    it("Expect that setgood breaks cycle", () => {
        let alg1: Alg = {
            calcPvrName: "Test1",
            content: "Test2 + 1",
        };
        let alg2: Alg = {
            calcPvrName: "Test2",
            content: "setgood(Test1) - 1",
        };
        let cycles = findAlgCycles([alg1, alg2]);
        expect(cycles.length).to.equal(0);
    });
    it("Expect that cycle due to setmeas is detected", () => {
        let alg1: Alg = {
            calcPvrName: "TestX",
            content: "setmeas(Test1, Test2)",
        };
        let alg2: Alg = {
            calcPvrName: "Test2",
            content: "Test1 - 1",
        };
        let cycles = findAlgCycles([alg1, alg2]);
        expect(cycles.length).to.equal(1);
    });
    it("Expect that self-cycle in setmeas is detected", () => {
        let alg1: Alg = {
            calcPvrName: "TestX",
            content: "setmeas(Test1, Test1)",
        };
        let cycles = findAlgCycles([alg1]);
        expect(cycles.length).to.equal(1);
    });
});
