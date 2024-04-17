import { expect } from "chai";
import {
    SepticParser,
    SepticScanner,
    SepticTokenType,
    parseSepticSync,
} from "../septic";

describe("Test tokenization of objects and identifiers", () => {
    it("Expect object tokens for object declaration", () => {
        const input = "System:  FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });
    it("Expect object token for object declaration with length one", () => {
        const input = "N:  FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect object tokens for object declaration", () => {
        const input = "System:         FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect object tokens for multiline object declaration", () => {
        const input = "System:\n  FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect no object tokens for incorrect object declaration", () => {
        const input = "System:FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });

    it("Expect no object tokens for incorrect object declaration", () => {
        const input = "System; FirstTest";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });

    it("Expect correct tokenization of object with scg in identifier", () => {
        const input = "SopcEvr:  {{ TestEvr }}";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect correct tokenization of object with scg in identifier", () => {
        const input = "SopcEvr:  Test{{ TestEvr }}Test";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect correct tokenization of object with number in identifier", () => {
        const input = "SopcEvr:  213Test";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect correct tokenization of object with underscore in identifier", () => {
        const input = "SopcEvr:  213_Test";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect correct tokenization of object with hyphen in identifier", () => {
        const input = "SopcEvr:  213-Test";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });
});

describe("Test tokenization of attributes", () => {
    it("Expect attribute token for correct attribute", () => {
        const input = "Text1= 1";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens[1].type).to.equal(SepticTokenType.numeric);
    });
    it("Expect attribute token for correct attribute", () => {
        const input = "Text1=   \n1";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens[1].type).to.equal(SepticTokenType.numeric);
    });
    it("Expect attribute token for correct attribute with length one", () => {
        const input = "N= 100";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens[1].type).to.equal(SepticTokenType.numeric);
    });
    it("Expect no attribute tokens for incorrect attribute declaration", () => {
        const input = "Test1=1";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });
    it("Expect no attribute tokens for incorrect attribute declaration", () => {
        const input = "Test1 =1";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });
    it("Expect no attribute tokens for incorrect attribute declaration", () => {
        const input = "Test1>= 1";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(5);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });
});

describe("Test tokenization of strings", () => {
    it("Expect correct tokenization of string", () => {
        const input = '"Test"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.string);
    });

    it("Expect correct tokenization of string containing jinja", () => {
        const input = '"{{ Jinja but should be hidden since string }}"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.string);
    });

    it("Expect correct tokenization of string containing block comment", () => {
        const input = '"/* Test */"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.string);
    });

    it("Expect correct tokenization of string containing attributes", () => {
        const input = '"Text2= 2"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.string);
    });
});

describe("Test tokenization of numeric expressions", () => {
    it("Expect numeric token for int", () => {
        const input = "3";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });
    it("Expect numeric token for numeric double", () => {
        const input = "3.14";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for negative double", () => {
        const input = "-3.14";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for positive numeric expression", () => {
        const input = "+3.14";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for scientific numeric expression", () => {
        const input = "3.14e-10";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for scientific numeric expression", () => {
        const input = "3.14E+10";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for scientific numeric expression", () => {
        const input = "3E+10";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for groupemask", () => {
        const input = "0000000000000000000000000";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect numeric token for bitmask", () => {
        const input = "0001";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect identifier token for incorrect scientific numeric expression", () => {
        const input = "3E-E";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect identifier token for incorrect numeric expression containing letters", () => {
        const input = "3FE";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(2);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect identifier token for incorrect numeric expression containing letters", () => {
        const input = "3.14F";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(3);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
    });

    it("Expect unknown token for incorrect numeric expression", () => {
        const input = "3.14.4";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.numeric);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
    });
});

describe("Test tokenization of code with unknown characters", () => {
    it("Expect unknown token for misplaced %", () => {
        const input = 'Test1= %"Dummy"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
        expect(tokens[2].type).to.equal(SepticTokenType.string);
    });

    it("Expect unknown token for misplaced =", () => {
        const input = 'Test1 = "Dummy"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
        expect(tokens[2].type).to.equal(SepticTokenType.string);
    });

    it("Expect unknown token for misplaced :", () => {
        const input = "Test1 : Test";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(4);
        expect(tokens[0].type).to.equal(SepticTokenType.identifier);
        expect(tokens[1].type).to.equal(SepticTokenType.unknown);
        expect(tokens[2].type).to.equal(SepticTokenType.identifier);
    });
});

describe("Test tokenization of comments", () => {
    it("Expect line comment token for line comment", () => {
        const input = `// Test1=  "Dummy"
        `;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.lineComment);
        expect(tokens.tokens.length).to.equal(1);
    });

    it("Expect that line comment is contained to line", () => {
        const input = `// Test1=  "Dummy"
                        Test2= 2
        `;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.lineComment);
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect block comment for block comment", () => {
        const input = '/* Text1= "" */';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.blockComment);
        expect(tokens.tokens.length).to.equal(1);
    });

    it("Expect block comment is limited", () => {
        const input = '/* Text1= "" */ Test2= 2';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.blockComment);
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.numeric);
    });

    it("Expect jinja comment token for jinja comment", () => {
        const input = "{# Bits2=  0001 #}";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.jinjaComment);
        expect(tokens.tokens.length).to.equal(1);
    });

    it("Expect jinja comment to be limited", () => {
        const input = '{# Bits2=  0001 #} Text1= "Test"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(SepticTokenType.jinjaComment);
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.string);
    });

    it("Expect jinja expression token for jinja expression", () => {
        const input = "{%- if final|default(false) %}";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(
            SepticTokenType.jinjaExpression
        );
        expect(tokens.tokens.length).to.equal(1);
    });

    it("Expect jinja expression to be limited", () => {
        const input = '{%- if final|default(false) %} Text1= "Test"';
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.comments.length).to.equal(1);
        expect(tokens.comments[0].type).to.equal(
            SepticTokenType.jinjaExpression
        );
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.string);
    });
});

describe("Test tokenization of paths", () => {
    it("Expect correct tokenization of path", () => {
        const input = "Obj= /test/path ";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.path);
        expect(tokens.tokens[1].content).to.equal("/test/path");
    });

    it("Expect correct tokenization of wildcard path", () => {
        const input = "Obj= ~ ";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.tokens.length).to.equal(3);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.equal(SepticTokenType.path);
        expect(tokens.tokens[1].content).to.equal("~");
    });

    it("Expect no path tokens for invalid paths", () => {
        const input = "Obj= \bspath ";
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.tokens.length).to.equal(4);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(tokens.tokens[1].type).to.not.equal(SepticTokenType.path);
    });
});

describe("Test tokenization of blocks", () => {
    it("Expect correct tokenization of attribute with list of values", () => {
        const input = `Grps=  7
                 "Tables1"  "Tables2"  "Tables3"  "Tables4"  "Tables5"
                 "Tables6"  "Tables7"`;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(10);
        expect(tokens[0].type).to.equal(SepticTokenType.attribute);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.string;
            }).length
        ).to.equal(7);
    });

    it("Expect correct tokenization of small object", () => {
        const input = `
        System:  TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test, 2: Test, 3: Test"
         Nsecs=  10
       PlotMax=  10`;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(11);
        expect(tokens[0].type).to.equal(SepticTokenType.object);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.attribute;
            }).length
        ).to.equal(4);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.numeric;
            }).length
        ).to.equal(2);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.string;
            }).length
        ).to.equal(2);
    });

    it("Expect correct tokenization of small object containing comments", () => {
        const input = `
        System:  TESTAPP // Test comment
         Text1=  /* Test comment */ "Dummy applikasjon" 
         Text2=  "1: Test, 2: Test, 3: Test"
         Nsecs=  10 
         {# PlotMax=  10 #}`;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens();
        expect(tokens.tokens.length).to.equal(9);
        expect(tokens.tokens[0].type).to.equal(SepticTokenType.object);
        expect(
            tokens.tokens.filter((el) => {
                return el.type === SepticTokenType.attribute;
            }).length
        ).to.equal(3);
        expect(
            tokens.tokens.filter((el) => {
                return el.type === SepticTokenType.numeric;
            }).length
        ).to.equal(1);
        expect(
            tokens.tokens.filter((el) => {
                return el.type === SepticTokenType.string;
            }).length
        ).to.equal(2);
        expect(tokens.comments.length).to.equal(3);
    });

    it("Expect correct lexing of complete cvr object", () => {
        const input = `  Cvr:           TestCvr
         Text1=  "Test Cvr"
         Text2=  ""
          Mode=  TRACKING
          Auto=  OFF
       PlotMax=  15
       PlotMin=  0
      PlotSpan=  -1
       PlotGrp=  0000000000000000000000000000000
          Nfix=  2
        MaxChg=  -1
          Unit=  "MSm3/d"
          Meas=  10.05
       GrpMask=  1000000000000000000000000000000
       GrpType=  0000000000000000000000000000000
          Span=  0.2
      SetPntOn=  6.0
       HighOff=  0
        LowOff=  0
    SetPntPrio=  2
      HighPrio=  1
       LowPrio=  1
   HighBackOff=  0
    LowBackOff=  0
          Fulf=  1
    // High priority on HighPnlty
     HighPnlty=  1
      LowPnlty=  1
     HighLimit=  1000
      LowLimit=  1000
     RelxParam=  3    1   30   80
   FulfReScale=  0.001
      SetpTref=  1
     BiasTfilt=  0
     BiasTpred=  0
     ConsTfilt=  -1
         Integ=  0
 TransformType=  NOTRANS
     BadCntLim=  0
       DesHorz=  0
         Neval=  5
        EvalDT=  0
/*   KeepTargets=  OFF
MeasValidation=  OFF */
 MeasHighLimit=  1e+010
  MeasLowLimit=  -1e+010
        LockHL=  OFF
        LockSP=  OFF
        LockLL=  OFF
UseFactorWeight=  0`;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.attribute;
            }).length
        ).to.equal(46);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.string;
            }).length
        ).to.equal(3);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.numeric;
            }).length
        ).to.equal(40);
    });

    it("Expect correct tokenization of small object", () => {
        const input = `XvrPlot:       {{ Wellname }}TestCvr
           Row=  3
           Col=  1
       RowSize=  3
       ColSize=  2`;
        const scanner = new SepticScanner(input);
        let tokens = scanner.scanTokens().tokens;
        expect(tokens.length).to.equal(11);
        expect(tokens[1].type).to.equal(SepticTokenType.identifier);
        expect(
            tokens.filter((el) => {
                return el.type === SepticTokenType.attribute;
            }).length
        ).to.equal(4);
    });
});

describe("Test basic functionality of parser", () => {
    it("Test parsing of attribute with single value", () => {
        let tokens = [
            {
                type: SepticTokenType.attribute,
                start: 0,
                end: 7,
                content: "Test",
            },

            {
                type: SepticTokenType.string,
                start: 10,
                end: 14,
                content: "Test",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let attr = parser.attribute();
        expect(attr.key).to.equal("Test");
        expect(attr.values.length).to.equal(1);
        expect(attr.values[0].value).to.equal("Test");
    });

    it("Test parsing of attribute with multiple values", () => {
        let tokens = [
            {
                type: SepticTokenType.attribute,
                start: 0,
                end: 7,
                content: "Test",
            },

            {
                type: SepticTokenType.string,
                start: 10,
                end: 14,
                content: "Test",
            },

            {
                type: SepticTokenType.numeric,
                start: 15,
                end: 17,
                content: "77",
            },

            {
                type: SepticTokenType.numeric,
                start: 18,
                end: 53,
                content: "00000000000000000000001",
            },

            {
                type: SepticTokenType.numeric,
                start: 55,
                end: 59,
                content: "1000",
            },
            {
                type: SepticTokenType.identifier,
                start: 60,
                end: 63,
                content: "OFF",
            },
            {
                type: SepticTokenType.path,
                start: 65,
                end: 70,
                content: "/test/path",
            },
            {
                type: SepticTokenType.eof,
                start: 100,
                end: 100,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let attr = parser.attribute();
        expect(attr.key).to.equal("Test");
        expect(attr.values.length).to.equal(6);
        expect(attr.values[0].value).to.equal("Test");
        expect(attr.values[1].value).to.equal("77");
        expect(attr.values[2].value).to.equal("00000000000000000000001");
        expect(attr.values[3].value).to.equal("1000");
        expect(attr.values[4].value).to.equal("OFF");
        expect(attr.values[5].value).to.equal("/test/path");
    });

    it("Test parsing of variables with one part", () => {
        let tokens = [
            {
                type: SepticTokenType.identifier,
                start: 0,
                end: 7,
                content: "Variable",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let variable = parser.identifier();
        expect(variable.name).to.equal("Variable");
    });

    it("Test parsing of septic object with single attribute", () => {
        let tokens = [
            {
                type: SepticTokenType.object,
                start: 0,
                end: 7,
                content: "Test",
            },
            {
                type: SepticTokenType.identifier,
                start: 0,
                end: 7,
                content: "Variable",
            },
            {
                type: SepticTokenType.attribute,
                start: 0,
                end: 7,
                content: "Test",
            },
            {
                type: SepticTokenType.string,
                start: 10,
                end: 14,
                content: "Test",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let obj = parser.septicObject();
        expect(obj.type).to.equal("Test");
        expect(obj.attributes.length).to.equal(1);
    });
});

describe("Test error handling during parsing", () => {
    it("Parsing of attribute with unknown tokens", () => {
        let tokens = [
            {
                type: SepticTokenType.attribute,
                start: 0,
                end: 7,
                content: "Test",
            },
            {
                type: SepticTokenType.string,
                start: 10,
                end: 14,
                content: "Test",
            },
            {
                type: SepticTokenType.unknown,
                start: 15,
                end: 16,
                content: "?",
            },
            {
                type: SepticTokenType.numeric,
                start: 17,
                end: 19,
                content: "10",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let attr = parser.attribute();
        expect(attr.values.length).to.equal(2);
        expect(parser.errors.length).to.equal(1);
    });

    it("Parsing of septic object with unknown tokens ", () => {
        let tokens = [
            {
                type: SepticTokenType.object,
                start: 0,
                end: 7,
                content: "System",
            },
            {
                type: SepticTokenType.unknown,
                start: 10,
                end: 14,
                content: "?",
            },
            {
                type: SepticTokenType.identifier,
                start: 15,
                end: 16,
                content: "Variable",
            },
            {
                type: SepticTokenType.attribute,
                start: 17,
                end: 19,
                content: "Text1",
            },
            {
                type: SepticTokenType.string,
                start: 17,
                end: 19,
                content: "Here!",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let obj = parser.septicObject();
        expect(obj.attributes.length).to.equal(1);
        expect(obj.identifier).not.to.equal(null);
        expect(parser.errors.length).to.equal(1);
    });

    it("Parsing of septic object without variable ", () => {
        let tokens = [
            {
                type: SepticTokenType.object,
                start: 0,
                end: 7,
                content: "System",
            },
            {
                type: SepticTokenType.attribute,
                start: 17,
                end: 19,
                content: "Text1",
            },
            {
                type: SepticTokenType.string,
                start: 17,
                end: 19,
                content: "Here!",
            },
            {
                type: SepticTokenType.eof,
                start: 15,
                end: 15,
                content: "",
            },
        ];
        let parser = new SepticParser(tokens);
        parser.advance();
        let obj = parser.septicObject();
        expect(obj.attributes.length).to.equal(1);
        expect(obj.identifier).to.equal(undefined);
        expect(parser.errors.length).to.equal(1);
    });
});

describe("Test parsing of valid input", () => {
    it("Parsing of small object block", () => {
        const input = `System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test �, 2: Test �, 3: Test �"
         Nsecs=  10
        ClipOn=  OFF
			 GrpLock=  0000000000000000000000000
				`;
        let cnfg = parseSepticSync(input);
        expect(cnfg.objects.length).to.equal(1);
        expect(cnfg.objects[0].attributes.length).to.equal(5);
        let expected = [
            { name: "Text1", length: 1, values: [`"Dummy applikasjon"`] },
            {
                name: "Text2",
                length: 1,
                values: [`"1: Test �, 2: Test �, 3: Test �"`],
            },
            { name: "Nsecs", length: 1, values: ["10"] },
            { name: "ClipOn", length: 1, values: ["OFF"] },
            {
                name: "GrpLock",
                length: 1,
                values: ["0000000000000000000000000"],
            },
        ];
        let object = cnfg.objects[0];
        for (let i = 0; i < expected.length; i++) {
            expect(object.attributes[i].key).to.equal(expected[i].name);
            expect(object.attributes[i].values.length).to.equal(
                expected[i].length
            );
            let values: any[] = [];
            object.attributes[i].values.forEach((elem) => {
                values.push(elem.value);
            });
            expect(values).to.deep.equal(expected[i].values);
        }
    });
});
