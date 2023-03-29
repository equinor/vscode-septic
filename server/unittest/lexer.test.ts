import { TokenType, tokenize } from "../src/parser";

describe("Basic tests lexer", () => {
  test("Lexing keyword", () => {
    const input = "System:  FirstTest";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Object);
    expect(tokens[1].type).toBe(TokenType.Variable);
  });

  test("Lexing keyword with scg variable", () => {
    const input = "SopcEvr:  {{ TestEvr }}";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Object);
    expect(tokens[1].type).toBe(TokenType.ScgVariable);
  });

  test("Lexing tagmap with string value", () => {
    const input = 'Test1= "Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.String);
  });

  test("Lexing tagmap with scg in string value", () => {
    const input = 'Text1= "{{ Jinja but should be hidden since string }}"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.String);
  });

  test("Lexing tagmap with number value", () => {
    const input = "Test2= 3.14";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.Numeric);
  });

  test("Lexing tagmap with groupmask value", () => {
    const input = "GrpLock=  0000000000000000000000000";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.Groupmask);
  });

  test("Lexing tagmap with bits value", () => {
    const input = "Bits2=  0001";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.Bits);
  });

  test("Lexing blocking tagmap", () => {
    const input = "Blocking=  8    1    2    4    8   16   32   64   96";
    let tokens = tokenize(input);
    expect(tokens.length).toBe(11);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.Numeric);
    expect(tokens[2].type).toBe(TokenType.Numeric);
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
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.String);
  });

  test("Lexing with unknown character", () => {
    const input = 'Test1= ?"Dummy"';
    let tokens = tokenize(input);
    expect(tokens.length).toBe(4);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(tokens[1].type).toBe(TokenType.Unknown);
    expect(tokens[2].type).toBe(TokenType.String);
  });

  test("Lexing group tag", () => {
    const input = `Grps=  7
                 "Tables1"  "Tables2"  "Tables3"  "Tables4"  "Tables5"
                 "Tables6"  "Tables7"`;
    let tokens = tokenize(input);
    expect(tokens.length).toBe(10);
    expect(tokens[0].type).toBe(TokenType.Attribute);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.String;
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
    expect(tokens[0].type).toBe(TokenType.Object);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.Attribute;
      }).length
    ).toBe(4);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.Numeric;
      }).length
    ).toBe(2);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.String;
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
        return el.type === TokenType.Attribute;
      }).length
    ).toBe(46);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.String;
      }).length
    ).toBe(3);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.Groupmask;
      }).length
    ).toBe(3);
  });

  test("Test lexer for plot", () => {
    const input = `XvrPlot:       {{ Wellname }}TestCvr
           Row=  3
           Col=  1
       RowSize=  3
       ColSize=  2`;
    let tokens = tokenize(input);
    expect(tokens.length).toBe(12);
    expect(tokens[1].type).toBe(TokenType.ScgVariable);
    expect(tokens[2].type).toBe(TokenType.Variable);
    expect(
      tokens.filter((el) => {
        return el.type === TokenType.Attribute;
      }).length
    ).toBe(4);
  });
});
