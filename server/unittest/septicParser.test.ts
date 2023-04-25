import {
  SepticParser,
  SepticTokenType,
  parseSeptic,
  tokenize,
} from "../src/parser";

describe("Basic tests lexer", () => {
  test("Lexing keyword", () => {
    const input = "System:  FirstTest";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Object);
    expect(tokens[1].type).toBe(SepticTokenType.Identifier);
  });

  test("Lexing keyword with scg variable", () => {
    const input = "SopcEvr:  {{ TestEvr }}";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Object);
    expect(tokens[1].type).toBe(SepticTokenType.Identifier);
  });

  test("Lexing tagmap with string value", () => {
    const input = 'Test1= "Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.String);
  });

  test("Lexing tagmap with scg in string value", () => {
    const input = 'Text1= "{{ Jinja but should be hidden since string }}"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.String);
  });

  test("Lexing tagmap with number value", () => {
    const input = "Test2= 3.14";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.Numeric);
  });

  test("Lexing tagmap with groupmask value", () => {
    const input = "GrpLock=  0000000000000000000000000";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.Numeric);
  });

  test("Lexing tagmap with bits value", () => {
    const input = "Bits2=  0001";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.Numeric);
  });

  test("Lexing blocking tagmap", () => {
    const input = "Blocking=  8    1    2    4    8   16   32   64   96";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(11);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.Numeric);
    expect(tokens[2].type).toBe(SepticTokenType.Numeric);
  });

  test("Lexing line comment", () => {
    const input = '// Test1=  "Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(1);
  });

  test("Lexing block comment", () => {
    const input = '/* Bits2=  0001 */ Test1= "Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.String);
  });

  test("Lexing jinja comment", () => {
    const input = '{# Bits2=  0001 #} Test1= "Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.String);
  });

  test("Lexing with unknown character", () => {
    const input = 'Test1= ?"Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(4);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(tokens[1].type).toBe(SepticTokenType.Unknown);
    expect(tokens[2].type).toBe(SepticTokenType.String);
  });

  test("Lexing group tag", () => {
    const input = `Grps=  7
                 "Tables1"  "Tables2"  "Tables3"  "Tables4"  "Tables5"
                 "Tables6"  "Tables7"`;
    let tokens = tokenize(input);
    expect(tokens.length).toBe(10);
    expect(tokens[0].type).toBe(SepticTokenType.Attribute);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.String;
      }).length
    ).toBe(7);
  });
});

describe("Test lexing of blocks", () => {
  test("Test lexing of small system block", () => {
    const input = `  System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test �, 2: Test �, 3: Test �"
         Nsecs=  10
       PlotMax=  10`;
    let tokens = tokenize(input);
    expect(tokens.length).toBe(11);
    expect(tokens[0].type).toBe(SepticTokenType.Object);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.Attribute;
      }).length
    ).toBe(4);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.Numeric;
      }).length
    ).toBe(2);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.String;
      }).length
    ).toBe(2);
  });

  test("Test lexing of Cvr", () => {
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
    let tokens = tokenize(input);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.Attribute;
      }).length
    ).toBe(46);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.String;
      }).length
    ).toBe(3);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.Numeric;
      }).length
    ).toBe(40);
  });

  test("Test lexer for plot", () => {
    const input = `XvrPlot:       {{ Wellname }}TestCvr
           Row=  3
           Col=  1
       RowSize=  3
       ColSize=  2`;
    let tokens = tokenize(input);
    expect(tokens.length).toBe(11);
    expect(tokens[1].type).toBe(SepticTokenType.Identifier);
    expect(
      tokens.filter((el) => {
        return el.type === SepticTokenType.Attribute;
      }).length
    ).toBe(4);
  });
});

describe("Test basic functionality of parser", () => {
  test("Test parsing of attribute with single value", () => {
    let tokens = [
      {
        type: SepticTokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },

      {
        type: SepticTokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let attr = parser.attribute();
    expect(attr.name).toBe("Test");
    expect(attr.values.length).toBe(1);
    expect(attr.values[0].value).toBe("Test");
  });

  test("Test parsing of attribute with multiple values", () => {
    let tokens = [
      {
        type: SepticTokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },

      {
        type: SepticTokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },

      {
        type: SepticTokenType.Numeric,
        start: 15,
        end: 17,
        content: "77",
      },

      {
        type: SepticTokenType.Numeric,
        start: 18,
        end: 53,
        content: "00000000000000000000001",
      },

      {
        type: SepticTokenType.Numeric,
        start: 55,
        end: 59,
        content: "1000",
      },
      {
        type: SepticTokenType.Identifier,
        start: 60,
        end: 63,
        content: "OFF",
      },
      {
        type: SepticTokenType.EOF,
        start: 100,
        end: 100,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let attr = parser.attribute();
    expect(attr.name).toBe("Test");
    expect(attr.values.length).toBe(5);
    expect(attr.values[0].value).toBe("Test");
    expect(attr.values[1].value).toBe("77");
    expect(attr.values[2].value).toBe("00000000000000000000001");
    expect(attr.values[3].value).toBe("1000");
    expect(attr.values[4].value).toBe("OFF");
  });

  test("Test parsing of variables with one part", () => {
    let tokens = [
      {
        type: SepticTokenType.Identifier,
        start: 0,
        end: 7,
        content: "Variable",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let variable = parser.variable();
    expect(variable.name).toBe("Variable");
  });

  test("Test parsing of septic object with single attribute", () => {
    let tokens = [
      {
        type: SepticTokenType.Object,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: SepticTokenType.Identifier,
        start: 0,
        end: 7,
        content: "Variable",
      },
      {
        type: SepticTokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: SepticTokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let obj = parser.septicObject();
    expect(obj.name).toBe("Test");
    expect(obj.attributes.length).toBe(1);
  });
});

describe("Test error handling during parsing", () => {
  test("Parsing of attribute with unknown tokens", () => {
    let tokens = [
      {
        type: SepticTokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: SepticTokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: SepticTokenType.Unknown,
        start: 15,
        end: 16,
        content: "?",
      },
      {
        type: SepticTokenType.Numeric,
        start: 17,
        end: 19,
        content: "10",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let attr = parser.attribute();
    expect(attr.values.length).toBe(2);
    expect(parser.errors.length).toBe(1);
  });

  test("Parsing of septic object with unknown tokens ", () => {
    let tokens = [
      {
        type: SepticTokenType.Object,
        start: 0,
        end: 7,
        content: "System",
      },
      {
        type: SepticTokenType.Unknown,
        start: 10,
        end: 14,
        content: "?",
      },
      {
        type: SepticTokenType.Identifier,
        start: 15,
        end: 16,
        content: "Variable",
      },
      {
        type: SepticTokenType.Attribute,
        start: 17,
        end: 19,
        content: "Text1",
      },
      {
        type: SepticTokenType.String,
        start: 17,
        end: 19,
        content: "Here!",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let obj = parser.septicObject();
    expect(obj.attributes.length).toBe(1);
    expect(obj.variable).not.toBeNull();
    expect(parser.errors.length).toBe(1);
  });

  test("Parsing of septic object without variable ", () => {
    let tokens = [
      {
        type: SepticTokenType.Object,
        start: 0,
        end: 7,
        content: "System",
      },
      {
        type: SepticTokenType.Attribute,
        start: 17,
        end: 19,
        content: "Text1",
      },
      {
        type: SepticTokenType.String,
        start: 17,
        end: 19,
        content: "Here!",
      },
      {
        type: SepticTokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new SepticParser(tokens);
    parser.advance();
    let obj = parser.septicObject();
    expect(obj.attributes.length).toBe(1);
    expect(obj.variable).toBeUndefined();
    expect(parser.errors.length).toBe(1);
  });
});

describe("Test parsing of valid input", () => {
  test("Parsing of small object block", () => {
    const input = `System:        TESTAPP
         Text1=  "Dummy applikasjon"
         Text2=  "1: Test �, 2: Test �, 3: Test �"
         Nsecs=  10
        ClipOn=  OFF
			 GrpLock=  0000000000000000000000000
				`;
    let cnfg = parseSeptic(input);
    expect(cnfg.objects.length).toBe(1);
    expect(cnfg.objects[0].attributes.length).toBe(5);
    let expected = [
      { name: "Text1", length: 1, values: [`"Dummy applikasjon"`] },
      {
        name: "Text2",
        length: 1,
        values: [`"1: Test �, 2: Test �, 3: Test �"`],
      },
      { name: "Nsecs", length: 1, values: ["10"] },
      { name: "ClipOn", length: 1, values: ["OFF"] },
      { name: "GrpLock", length: 1, values: ["0000000000000000000000000"] },
    ];
    let object = cnfg.objects[0];
    for (let i = 0; i < expected.length; i++) {
      expect(object.attributes[i].name).toBe(expected[i].name);
      expect(object.attributes[i].values.length).toBe(expected[i].length);
      let values: any[] = [];
      object.attributes[i].values.forEach((elem) => {
        values.push(elem.value);
      });
      expect(values).toStrictEqual(expected[i].values);
    }
  });
});
