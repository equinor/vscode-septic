import {
    AlgTokenType,
    AlgBinary,
    AlgFunction,
    AlgGrouping,
    AlgScanner,
    AlgLiteral,
    parseAlg,
    AlgUnary,
} from "../src/septic";

describe("Test scanning of operators", () => {
    test("Scanning of plus", () => {
        const input = "1+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.plus);
    });
    test("Scanning of plus", () => {
        const input = "var1+var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.plus);
    });
    test("Scanning of minus", () => {
        const input = "1-2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.minus);
    });
    test("Scanning of minus", () => {
        const input = "var1-var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.minus);
    });
    test("Scanning of div", () => {
        const input = "1/3";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.div);
    });
    test("Scanning of div", () => {
        const input = "var1/var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.div);
    });
    test("Scanning of mul", () => {
        const input = "1*3";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.mul);
    });
    test("Scanning of mul", () => {
        const input = "var1*var2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.mul);
    });
    test("Scanning of less", () => {
        const input = "test<2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.less);
    });
    test("Scanning of less-equal", () => {
        const input = "test<=2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.lessEqual);
    });
    test("Scanning of greater", () => {
        const input = "test>2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.greater);
    });
    test("Scanning of greater equal", () => {
        const input = "test>=2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[1].type).toBe(AlgTokenType.greaterEqual);
    });
});

describe("Test scanning of numbers", () => {
    test("Scanning of single digit", () => {
        const input = "1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.number);
    });
    test("Scanning of multiple digit", () => {
        const input = "56";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.number);
    });
    test("Scanning of number with point", () => {
        const input = "32.1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.number);
    });
    test("Scanning of number with invalid point", () => {
        const input = ".10";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe(AlgTokenType.dot);
        expect(tokens[1].type).toBe(AlgTokenType.number);
    });
    test("Scanning of number with invalid point", () => {
        const input = "6.";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe(AlgTokenType.number);
        expect(tokens[1].type).toBe(AlgTokenType.dot);
    });
});

describe("Test scanning of functions", () => {
    test("Scanning of function with single argument", () => {
        const input = "abs(-2)";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(6);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
        expect(tokens[1].type).toBe(AlgTokenType.leftParen);
        expect(tokens[4].type).toBe(AlgTokenType.rightParen);
    });
    test("Scanning of function with multiple arguments", () => {
        const input = "and(1,0)";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(7);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
        expect(tokens[1].type).toBe(AlgTokenType.leftParen);
        expect(tokens[3].type).toBe(AlgTokenType.comma);
        expect(tokens[5].type).toBe(AlgTokenType.rightParen);
    });
});

describe("Test scanning with skip", () => {
    test("Scanning of function with space", () => {
        const input = "1 + 2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
    });
    test("Scanning of function with newline", () => {
        const input = "1\n+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
    });
    test("Scanning of function with tab", () => {
        const input = "1\t+2";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
    });
});

describe("Test scanning of identifiers", () => {
    test("Scanning of identifier with only alpha", () => {
        const input = "var";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
    });
    test("Scanning of identifier with alphanumeric", () => {
        const input = "var1";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
    });
    test("Scanning of identifier with hyphen", () => {
        const input = "var-test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(4);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
        expect(tokens[2].type).toBe(AlgTokenType.identifier);
    });
    test("Scanning of identifier with underscore", () => {
        const input = "var_test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
    });
    test("Scanning of identifier starting with digit", () => {
        const input = "20TC5014";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.identifier);
    });
    test("Scanning of identifier starting with jinja", () => {
        const input = "{{ Wellname }}";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(2);
        expect(tokens[0].type).toBe(AlgTokenType.jinja);
    });
    test("Scanning of identifier starting with jinja followed by identifier", () => {
        const input = "{{ Wellname }}Test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe(AlgTokenType.jinja);
        expect(tokens[0].content).toBe("{{ Wellname }}");
        expect(tokens[1].type).toBe(AlgTokenType.identifier);
        expect(tokens[1].content).toBe("Test");
    });
    test("Scanning of multiple identifiers with jinja", () => {
        const input = "{{ Wellname }} Test";
        const scanner = new AlgScanner(input);
        const tokens = scanner.scanTokens();
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe(AlgTokenType.jinja);
        expect(tokens[0].content).toBe("{{ Wellname }}");
        expect(tokens[1].type).toBe(AlgTokenType.identifier);
        expect(tokens[1].content).toBe("Test");
    });
});

describe("Test parsing of basic expressions", () => {
    test("Parsing of addition", () => {
        const input = "1+2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.plus);
    });

    test("Parsing of subtraction", () => {
        const input = "12-23";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.minus);
    });
    test("Parsing of multiplication", () => {
        const input = "9*896";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.mul);
    });
    test("Parsing of division", () => {
        const input = "21/7";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.div);
    });
    test("Parsing of less", () => {
        const input = "1<2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.less);
    });
    test("Parsing of less-equal", () => {
        const input = "1<=2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.lessEqual);
    });
    test("Parsing of greater", () => {
        const input = "1>2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.greater);
    });
    test("Parsing of greater-equal", () => {
        const input = "1>=2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(
            AlgTokenType.greaterEqual
        );
    });
    test("Parsing of equalequal", () => {
        const input = "1==2";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgBinary);
        expect((<AlgBinary>expr).operator?.type).toBe(AlgTokenType.equalEqual);
    });
    test("Parsing of grouping", () => {
        const input = "(1+2)";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgGrouping);
        expect((<AlgGrouping>expr).expr).toBeInstanceOf(AlgBinary);
    });
    test("Parsing of unary", () => {
        const input = "-(1+2)";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgUnary);
        expect((<AlgUnary>expr).right).toBeInstanceOf(AlgGrouping);
    });
});

describe("Test parsing of variables", () => {
    test("Parsing of normal variable", () => {
        const input = "var1";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgLiteral);
        expect((<AlgLiteral>expr).value).toBe("var1");
    });
    test("Parsing of jinja variable", () => {
        const input = "{{ Test }}";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgLiteral);
        expect((<AlgLiteral>expr).value).toBe("{{Test}}");
    });
    test("Parsing of combined variable", () => {
        const input = "var1{{ Test }}";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgLiteral);
        expect((<AlgLiteral>expr).value).toBe("var1{{Test}}");
    });
    test("Parsing of combined variable", () => {
        const input = "var1{{ Test1 }}var2{{ Test2 }}";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgLiteral);
        expect((<AlgLiteral>expr).value).toBe("var1{{Test1}}var2{{Test2}}");
    });
    test("Parsing of variable with subvariable", () => {
        const input = "test.first";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgLiteral);
        expect((<AlgLiteral>expr).value).toBe("test.first");
    });
});

describe("Test parsing of functions", () => {
    test("Parsing of function with zero arguments", () => {
        const input = "add()";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgFunction);
        expect((<AlgFunction>expr).args.length).toBe(0);
    });

    test("Parsing of function with multiple arguments", () => {
        const input = "add(1,2)";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgFunction);
        expect((<AlgFunction>expr).args.length).toBe(2);
        expect((<AlgFunction>expr).identifier).toBe("add");
        expect((<AlgFunction>expr).args[0]).toBeInstanceOf(AlgLiteral);
        expect((<AlgFunction>expr).args[1]).toBeInstanceOf(AlgLiteral);
    });
    test("Parsing of nested functions", () => {
        const input = "and(not(true),false)";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgFunction);
        expect((<AlgFunction>expr).args.length).toBe(2);
        expect((<AlgFunction>expr).identifier).toBe("and");
        expect((<AlgFunction>expr).args[0]).toBeInstanceOf(AlgFunction);
        expect((<AlgFunction>expr).args[1]).toBeInstanceOf(AlgLiteral);
    });
    test("Parsing of trublesome function", () => {
        const input = "intpoltype1({{ Wellname }}Zpc_Y, {{ Cv_curve_well }})";
        const expr = parseAlg(input);
        expect(expr).toBeInstanceOf(AlgFunction);
        expect((<AlgFunction>expr).args.length).toBe(2);
        expect((<AlgFunction>expr).identifier).toBe("intpoltype1");
        expect((<AlgFunction>expr).args[0]).toBeInstanceOf(AlgLiteral);
        expect((<AlgFunction>expr).args[1]).toBeInstanceOf(AlgLiteral);
    });
});

describe("Test parsing of invalid algs", () => {
    test("Parsing of function with missing closing parenthesis", () => {
        const input = "and(not(true),false";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of grouping with missing closing parenthesis", () => {
        const input = "(1+2";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of expression with double plus", () => {
        const input = "1 ++ 2";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of incomplete jinja", () => {
        const input = "{{ test";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of invalid jinja", () => {
        const input = "{{ test }";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of invalid jinja", () => {
        const input = "{{ test } }";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of trailing dot", () => {
        const input = "test.";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of seperate dot", () => {
        const input = "test .";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
    test("Parsing of missing argument", () => {
        const input = "test(1,)";
        const parse = () => {
            parseAlg(input);
        };
        expect(parse).toThrow();
    });
});
