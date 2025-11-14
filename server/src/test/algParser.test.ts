import { expect } from "chai";
import {
    AlgTokenType,
    AlgBinary,
    AlgCalc,
    AlgGrouping,
    AlgScanner,
    AlgLiteral,
    parseAlg,
    AlgUnary,
} from "../septic";

describe("Test scanning of operators", () => {
    it("Scanning of plus", () => {
        const input = "1+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.plus);
    });
    it("Scanning of plus", () => {
        const input = "var1+var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.plus);
    });
    it("Scanning of minus", () => {
        const input = "1-2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.minus);
    });
    it("Scanning of minus", () => {
        const input = "var1-var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.minus);
    });
    it("Scanning of div", () => {
        const input = "1/3";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.div);
    });
    it("Scanning of div", () => {
        const input = "var1/var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.div);
    });
    it("Scanning of mul", () => {
        const input = "1*3";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.mul);
    });
    it("Scanning of mul", () => {
        const input = "var1*var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.mul);
    });
    it("Scanning of less", () => {
        const input = "test<2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.less);
    });
    it("Scanning of less-equal", () => {
        const input = "test<=2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.lessEqual);
    });
    it("Scanning of greater", () => {
        const input = "test>2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.greater);
    });
    it("Scanning of greater equal", () => {
        const input = "test>=2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[1].type).to.equal(AlgTokenType.greaterEqual);
    });
});

describe("Test scanning of numbers", () => {
    it("Scanning of single digit", () => {
        const input = "1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.number);
    });
    it("Scanning of multiple digit", () => {
        const input = "56";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.number);
    });
    it("Scanning of number with point", () => {
        const input = "32.1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.number);
    });
    it("Scanning of number with invalid point", () => {
        const input = ".10";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(AlgTokenType.dot);
        expect(tokens[1].type).to.equal(AlgTokenType.number);
    });
    it("Scanning of number with invalid point", () => {
        const input = "6.";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(AlgTokenType.number);
        expect(tokens[1].type).to.equal(AlgTokenType.dot);
    });
});

describe("Test scanning of functions", () => {
    it("Scanning of function with single argument", () => {
        const input = "abs(-2)";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(6);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
        expect(tokens[1].type).to.equal(AlgTokenType.leftParen);
        expect(tokens[4].type).to.equal(AlgTokenType.rightParen);
    });
    it("Scanning of function with multiple arguments", () => {
        const input = "and(1,0)";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(7);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
        expect(tokens[1].type).to.equal(AlgTokenType.leftParen);
        expect(tokens[3].type).to.equal(AlgTokenType.comma);
        expect(tokens[5].type).to.equal(AlgTokenType.rightParen);
    });
});

describe("Test scanning with skip", () => {
    it("Scanning of function with space", () => {
        const input = "1 + 2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
    });
    it("Scanning of function with newline", () => {
        const input = "1\n+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
    });
    it("Scanning of function with tab", () => {
        const input = "1\t+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
    });
});

describe("Test scanning of identifiers", () => {
    it("Scanning of identifier with only alpha", () => {
        const input = "var";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
    });
    it("Scanning of identifier with alphanumeric", () => {
        const input = "var1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
    });
    it("Scanning of identifier with hyphen", () => {
        const input = "var-test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
        expect(tokens[2].type).to.equal(AlgTokenType.identifier);
    });
    it("Scanning of identifier with underscore", () => {
        const input = "var_test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
    });
    it("Scanning of identifier starting with digit", () => {
        const input = "20TC5014";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.identifier);
    });
    it("Scanning of identifier starting with jinja", () => {
        const input = "{{ Wellname }}";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(AlgTokenType.jinja);
    });
    it("Scanning of identifier starting with jinja followed by identifier", () => {
        const input = "{{ Wellname }}Test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(AlgTokenType.jinja);
        expect(tokens[0].content).to.equal("{{ Wellname }}");
        expect(tokens[1].type).to.equal(AlgTokenType.identifier);
        expect(tokens[1].content).to.equal("Test");
    });
    it("Scanning of multiple identifiers with jinja", () => {
        const input = "{{ Wellname }} Test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(AlgTokenType.jinja);
        expect(tokens[0].content).to.equal("{{ Wellname }}");
        expect(tokens[1].type).to.equal(AlgTokenType.identifier);
        expect(tokens[1].content).to.equal("Test");
    });
});

describe("Test parsing of basic expressions", () => {
    it("Parsing of addition", () => {
        const input = "1+2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.plus);
    });

    it("Parsing of subtraction", () => {
        const input = "12-23";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.minus);
    });
    it("Parsing of multiplication", () => {
        const input = "9*896";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.mul);
    });
    it("Parsing of division", () => {
        const input = "21/7";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.div);
    });
    it("Parsing of less", () => {
        const input = "1<2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.less);
    });
    it("Parsing of less-equal", () => {
        const input = "1<=2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(
            AlgTokenType.lessEqual
        );
    });
    it("Parsing of greater", () => {
        const input = "1>2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(AlgTokenType.greater);
    });
    it("Parsing of greater-equal", () => {
        const input = "1>=2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(
            AlgTokenType.greaterEqual
        );
    });
    it("Parsing of equalequal", () => {
        const input = "1==2";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgBinary);
        expect((expr as AlgBinary).operator?.type).to.equal(
            AlgTokenType.equalEqual
        );
    });
    it("Parsing of grouping", () => {
        const input = "(1+2)";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgGrouping);
        expect((expr as AlgGrouping).expr).to.instanceOf(AlgBinary);
    });
    it("Parsing of unary", () => {
        const input = "-(1+2)";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgUnary);
        expect((expr as AlgUnary).right).to.instanceOf(AlgGrouping);
    });
});

describe("Test parsing of variables", () => {
    it("Parsing of normal variable", () => {
        const input = "var1";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgLiteral);
        expect((expr as AlgLiteral).value).to.equal("var1");
    });
    it("Parsing of jinja variable", () => {
        const input = "{{ Test }}";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgLiteral);
        expect((expr as AlgLiteral).value).to.equal("{{Test}}");
    });
    it("Parsing of combined variable", () => {
        const input = "var1{{ Test }}";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgLiteral);
        expect((expr as AlgLiteral).value).to.equal("var1{{Test}}");
    });
    it("Parsing of combined variable", () => {
        const input = "var1{{ Test1 }}var2{{ Test2 }}";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgLiteral);
        expect((expr as AlgLiteral).value).to.equal("var1{{Test1}}var2{{Test2}}");
    });
    it("Parsing of variable with subvariable", () => {
        const input = "test.first";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgLiteral);
        expect((expr as AlgLiteral).value).to.equal("test.first");
    });
});

describe("Test parsing of functions", () => {
    it("Parsing of function with zero arguments", () => {
        const input = "add()";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgCalc);
        expect((expr as AlgCalc).params.length).to.equal(1);
        expect((expr as AlgCalc).params[0]).to.instanceOf(AlgLiteral);
    });

    it("Parsing of function with multiple arguments", () => {
        const input = "add(1,2)";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgCalc);
        expect((expr as AlgCalc).params.length).to.equal(2);
        expect((expr as AlgCalc).identifier).to.equal("add");
        expect((expr as AlgCalc).params[0]).to.instanceOf(AlgLiteral);
        expect((expr as AlgCalc).params[1]).to.instanceOf(AlgLiteral);
    });
    it("Parsing of nested functions", () => {
        const input = "and(not(true),false)";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgCalc);
        expect((expr as AlgCalc).params.length).to.equal(2);
        expect((expr as AlgCalc).identifier).to.equal("and");
        expect((expr as AlgCalc).params[0]).to.instanceOf(AlgCalc);
        expect((expr as AlgCalc).params[1]).to.instanceOf(AlgLiteral);
    });
    it("Parsing of trublesome function", () => {
        const input = "intpoltype1({{ Wellname }}Zpc_Y, {{ Cv_curve_well }})";
        const expr = parseAlg(input);
        expect(expr).to.instanceOf(AlgCalc);
        expect((expr as AlgCalc).params.length).to.equal(2);
        expect((expr as AlgCalc).identifier).to.equal("intpoltype1");
        expect((expr as AlgCalc).params[0]).to.instanceOf(AlgLiteral);
        expect((expr as AlgCalc).params[1]).to.instanceOf(AlgLiteral);
    });
});

describe("Test parsing of invalid algs", () => {
    it("Parsing of function with missing closing parenthesis", () => {
        const input = "and(not(true),false";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of grouping with missing closing parenthesis", () => {
        const input = "(1+2";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of expression with double plus", () => {
        const input = "1 ++ 2";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of incomplete jinja", () => {
        const input = "{{ test";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of invalid jinja", () => {
        const input = "{{ test }";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of invalid jinja", () => {
        const input = "{{ test } }";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of trailing dot", () => {
        const input = "test.";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.not.throw();
    });
    it("Parsing of seperate dot", () => {
        const input = "test .";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.throw();
    });
    it("Parsing of missing argument", () => {
        const input = "it(1,)";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).to.not.throw();
    });
});
