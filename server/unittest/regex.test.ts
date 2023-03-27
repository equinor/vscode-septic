import {
  NUMERIC_REGEX,
  OBJECT_REGEX,
  ATTRIBUTE_REGEX,
  BLOCK_COMMENT_REGEX,
  LINE_COMMENT_REGEX,
  STRING_REGEX,
  GROUPMASK_REGEX,
  BITS_REGEX,
  SCG_VARIABLE_REGEX,
  VARIABLE_REGEX,
} from "../src/parser/regex";

describe("Number regex test", () => {
  const regex = NUMERIC_REGEX;
  it("matches valid numbers", () => {
    expect(regex.test("42")).toBe(true);
    expect(regex.test("+3.14")).toBe(true);
    expect(regex.test("-0.5")).toBe(true);
    expect(regex.test("1e10")).toBe(true);
    expect(regex.test("2E-3")).toBe(true);
    expect(regex.test("4.2e+8")).toBe(true);
    expect(regex.test("10\n")).toBe(true);
  });

  it("does not match invalid numbers", () => {
    expect(regex.test("")).toBe(false);
    expect(regex.test("a")).toBe(false);
    expect(regex.test(".4")).toBe(false);
  });
});

describe("Keyword regex test", () => {
  const regex = new RegExp(OBJECT_REGEX);
  it("matches valid keywords", () => {
    expect(regex.test("System:  Test")).toBe(true);
    expect(regex.test("System: Test")).toBe(true);
    expect(regex.test("Test:  A1")).toBe(true);
  });

  it("does not match invalid keywords", () => {
    expect(regex.test("System::  Test")).toBe(false);
    expect(regex.test("System:Test")).toBe(false);
  });
});

describe("Tagmap Regex Tests", () => {
  const regex = ATTRIBUTE_REGEX;
  test("Does not match variables assignment without spaces", () => {
    const input = "var1=value1";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Matches tagmap assignment with spaces", () => {
    const input = "var1= value1";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(2);
    expect(matches?.[0]).toBe("var1= ");
    expect(matches?.[1]).toBe("var1");
  });

  test("Does not match tagmap with space in declaration", () => {
    const input = "var var1;";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match invalid input", () => {
    const input = "var1== 'value1';";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });
});

describe("Block comment Regex Tests", () => {
  const regex = BLOCK_COMMENT_REGEX;
  test("Matches block comment with text", () => {
    const input = "/* This is a block comment */";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });

  test("Matches empty block comment", () => {
    const input = "/* */";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
    expect(matches?.[0]).toBe("/* */");
  });

  test("Does not match inline comment", () => {
    const input = "var a = 10; // This is an inline comment";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match invalid input", () => {
    const input = "This is not a comment";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });
});

describe("Line Comment Regex Tests", () => {
  const regex = LINE_COMMENT_REGEX;
  test("Matches line comment with text", () => {
    const input = "// This is a line comment";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(3);
    expect(matches?.[0]).toBe("// This is a line comment");
    expect(matches?.[1]).toBe("//");
    expect(matches?.[2]).toBe(" This is a line comment");
  });

  test("Matches empty line comment", () => {
    const input = "//";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(3);
    expect(matches?.[0]).toBe("//");
    expect(matches?.[1]).toBe("//");
    expect(matches?.[2]).toBe("");
  });

  test("Does not match block comment", () => {
    const input = "/* This is a block comment */";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match invalid input", () => {
    const input = "This is not a comment";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });
});

describe("String Regex Tests", () => {
  const regex = STRING_REGEX;
  test("Matches a string with no whitespace", () => {
    const input = '"hello"';
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(2);
    expect(matches?.[0]).toBe('"hello"');
    expect(matches?.[1]).toBe("hello");
  });

  test("Matches a string with whitespace", () => {
    const input = '"hello world"';
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(2);
    expect(matches?.[0]).toBe('"hello world"');
    expect(matches?.[1]).toBe("hello world");
  });

  test("Matches a string with whitespace", () => {
    const input = `"Dummy applikasjon"
         Text2=  "1: Test �, 2: Test �, 3: Test �"
         Nsecs=  10
       PlotMax=  10
         Nhist=  8640
         Npred=  360
         Nmodl=  360`;
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(2);
    expect(matches?.[0]).toBe('"Dummy applikasjon"');
    expect(matches?.[1]).toBe("Dummy applikasjon");
  });

  test("Matches an empty string", () => {
    const input = '""';
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(2);
    expect(matches?.[0]).toBe('""');
    expect(matches?.[1]).toBe("");
  });

  test("Does not match a number", () => {
    const input = "123";
    const matches = String(input).match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match a boolean", () => {
    const input = "true";
    const matches = String(input).match(regex);
    expect(matches).toBeNull();
  });
});

describe("Groupmask Regex Tests", () => {
  const regex = GROUPMASK_REGEX;
  test("Matches a bitmask with 25 binary digits", () => {
    const input = "1010101010101010101010101";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[0]).toBe("1010101010101010101010101");
  });

  test("Matches a bitmask with more than 25 binary digits", () => {
    const input = "1010101010101010101010101111";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[0]).toBe("1010101010101010101010101111");
  });

  test("Does not match a bitmask with less than 25 binary digits", () => {
    const input = "10101010101010101010101";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match a string with non-binary digits", () => {
    const input = "10101010101010101010102";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match a string with whitespace", () => {
    const input = "10101010101010101010 10101";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });
});

// regex.test.ts

describe("Bits Regex Tests", () => {
  const regex = BITS_REGEX;
  test("Matches a bitmask with 4 binary digits", () => {
    const input = "1010";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[0]).toBe("1010");
  });

  test("Matches a bitmask with 24 binary digits", () => {
    const input = "101010101010101010101010";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[0]).toBe("101010101010101010101010");
  });

  test("Does not match a bitmask with less than 4 binary digits", () => {
    const input = "101";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match a bitmask with more than 24 binary digits", () => {
    const input = "1010101010101010101010101";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[0].length).toBe(24);
  });

  test("Does not match a string with non-binary digits", () => {
    const input = "10201";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });

  test("Does not match a string with whitespace", () => {
    const input = "101 010";
    const matches = input.match(regex);
    expect(matches).toBeNull();
  });
});

describe("Variable regex test", () => {
  const regex = VARIABLE_REGEX;
  test("matches valid strings", () => {
    expect(regex.test("abc123 ")).toBe(true);
    expect(regex.test("some-tag ")).toBe(true);
    expect(regex.test("some_tag ")).toBe(true);
    expect(regex.test("some-other-tag ")).toBe(true);
  });

  test("does not match invalid strings", () => {
    expect(regex.test("")).toBe(false);
    expect(regex.test(" ")).toBe(false);
    expect(regex.test(".test ")).toBe(false);
    expect(regex.test(">invalid ")).toBe(false);
  });

  test("does not match entire string with whitespace", () => {
    const input = "Hello world!";
    const matches = input.match(regex);
    expect(matches).not.toBeNull();
    expect(matches?.[1]).toBe("Hello");
  });
});

describe("SCG-variable regex test", () => {
  const regex = SCG_VARIABLE_REGEX;
  it("matches valid strings", () => {
    expect(regex.test("{{SomeText}}")).toBe(true);
    expect(regex.test("{{ SomeText }}")).toBe(true);
    expect(regex.test("{{SomeText123}}")).toBe(true);
    expect(regex.test("{{Some-Text}}")).toBe(true);
    expect(regex.test("{{Some_Text}}")).toBe(true);
    expect(regex.test("{{Some-Text}}extra")).toBe(true);
  });

  it("does not match invalid strings", () => {
    expect(regex.test("")).toBe(false);
    expect(regex.test("{{}}")).toBe(false);
    expect(regex.test("{{  }}")).toBe(false);
    expect(regex.test("{{Some Text}}")).toBe(false);
    expect(regex.test("Some-Text{{}}")).toBe(false);
  });
});
