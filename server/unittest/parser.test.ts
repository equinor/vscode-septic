import { Parser, tokenize, TokenType } from "../src/parser";

describe("Test basic functionality of parser", () => {
  test("Test parsing of attribute with single value", () => {
    let tokens = [
      {
        type: TokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },

      {
        type: TokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
    parser.advance();
    let attr = parser.attribute();
    expect(attr.name).toBe("Test");
    expect(attr.values.length).toBe(1);
    expect(attr.values[0].value).toBe("Test");
  });

  test("Test parsing of attribute with multiple values", () => {
    let tokens = [
      {
        type: TokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },

      {
        type: TokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },

      {
        type: TokenType.Numeric,
        start: 15,
        end: 17,
        content: "77",
      },

      {
        type: TokenType.Numeric,
        start: 18,
        end: 53,
        content: "00000000000000000000001",
      },

      {
        type: TokenType.Numeric,
        start: 55,
        end: 59,
        content: "1000",
      },
      {
        type: TokenType.Variable,
        start: 60,
        end: 63,
        content: "OFF",
      },
      {
        type: TokenType.EOF,
        start: 100,
        end: 100,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
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
        type: TokenType.Variable,
        start: 0,
        end: 7,
        content: "Variable",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
    parser.advance();
    let variable = parser.variable();
    expect(variable.name).toBe("Variable");
  });

  test("Test parsing of septic object with single attribute", () => {
    let tokens = [
      {
        type: TokenType.Object,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: TokenType.Variable,
        start: 0,
        end: 7,
        content: "Variable",
      },
      {
        type: TokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: TokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
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
        type: TokenType.Attribute,
        start: 0,
        end: 7,
        content: "Test",
      },
      {
        type: TokenType.String,
        start: 10,
        end: 14,
        content: "Test",
      },
      {
        type: TokenType.Unknown,
        start: 15,
        end: 16,
        content: "?",
      },
      {
        type: TokenType.Numeric,
        start: 17,
        end: 19,
        content: "10",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
    parser.advance();
    let attr = parser.attribute();
    expect(attr.values.length).toBe(2);
    expect(parser.errors.length).toBe(1);
  });

  test("Parsing of septic object with unknown tokens ", () => {
    let tokens = [
      {
        type: TokenType.Object,
        start: 0,
        end: 7,
        content: "System",
      },
      {
        type: TokenType.Unknown,
        start: 10,
        end: 14,
        content: "?",
      },
      {
        type: TokenType.Variable,
        start: 15,
        end: 16,
        content: "Variable",
      },
      {
        type: TokenType.Attribute,
        start: 17,
        end: 19,
        content: "Text1",
      },
      {
        type: TokenType.String,
        start: 17,
        end: 19,
        content: "Here!",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
    parser.advance();
    let obj = parser.septicObject();
    expect(obj.attributes.length).toBe(1);
    expect(obj.variable).not.toBeNull();
    expect(parser.errors.length).toBe(1);
  });

  test("Parsing of septic object without variable ", () => {
    let tokens = [
      {
        type: TokenType.Object,
        start: 0,
        end: 7,
        content: "System",
      },
      {
        type: TokenType.Attribute,
        start: 17,
        end: 19,
        content: "Text1",
      },
      {
        type: TokenType.String,
        start: 17,
        end: 19,
        content: "Here!",
      },
      {
        type: TokenType.EOF,
        start: 15,
        end: 15,
        content: "",
      },
    ];
    let parser = new Parser(tokens);
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
    let tokens = tokenize(input);
    let parser = new Parser(tokens);
    let cnfg = parser.parse();
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
