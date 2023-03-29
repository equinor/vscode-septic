import { Token, TokenType } from "./token";

export interface ParserError {
  message: string;
  token: Token;
}

let validAttributeTokens = [
  TokenType.Numeric,
  TokenType.String,
  TokenType.Bits,
  TokenType.Groupmask,
  TokenType.Enum,
];

let variableTokens = [TokenType.Variable, TokenType.ScgVariable];

export class Parser {
  tokens: Token[];
  current: number;
  errors: ParserError[];

  constructor(tokens: Token[]) {
    this.current = 0;
    this.errors = [];
    this.tokens = tokens;
  }

  parse(): SepticCnfg {
    let septicObjects = [];
    while (!this.isAtEnd()) {
      if (this.match(TokenType.Object)) {
        let septicObj = this.septicObject();
        septicObjects.push(septicObj);
      } else {
        this.synchronize(
          "Unexpected token. Expected septic object",
          TokenType.Object
        );
      }
    }
    return new SepticCnfg(septicObjects);
  }

  advance() {
    if (!this.isAtEnd()) {
      this.current += 1;
      return this.previous();
    }
  }

  previous(): Token {
    return this.tokens[this.current - 1];
  }

  peek(): Token {
    return this.tokens[this.current];
  }

  isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  match(...tokenTypes: TokenType[]): boolean {
    for (let i = 0; i < tokenTypes.length; i++) {
      if (this.check(tokenTypes[i])) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  check(tokenType: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type === tokenType;
  }

  synchronize(
    errorMsg: string = "Unexpected token",
    ...tokenTypes: TokenType[]
  ) {
    while (!this.isAtEnd()) {
      for (let i = 0; i < tokenTypes.length; i++) {
        if (this.check(tokenTypes[i])) {
          return;
        }
      }
      this.addError(errorMsg, this.peek());
      this.advance();
    }
  }

  addError(message: string, token: Token) {
    this.errors.push({ message: message, token: token });
  }
  septicObject(): SepticObject {
    let token: Token = this.previous();
    this.synchronize(
      "Unexpected token. Expected variable token",
      ...variableTokens,
      TokenType.Attribute,
      TokenType.Object
    );
    let variable;
    if (this.match(TokenType.Variable, TokenType.ScgVariable)) {
      variable = this.variable();
    } else {
      this.addError(
        "Expected variable type token after object declaration",
        token
      );
      variable = null;
    }

    let septicObject: SepticObject = new SepticObject(
      token.content,
      variable,
      token.start,
      token.end
    );

    this.synchronize(
      "Unexpected token! Expected attribute or object types",
      TokenType.Attribute,
      TokenType.Object
    );

    while (this.match(TokenType.Attribute)) {
      let attr = this.attribute();
      septicObject.addAttribute(attr);
    }
    septicObject.updateEnd();
    return septicObject;
  }

  attribute(): Attribute {
    let token: Token = this.previous();
    let attr = new Attribute(token.content, token.start, token.end);
    while (!this.isAtEnd()) {
      if (this.match(...validAttributeTokens)) {
        let value = this.attributeValue();
        attr.addValue(value);
        continue;
      }
      this.synchronize(
        "Unexpected token during parsing of value",
        TokenType.Attribute,
        TokenType.Object,
        ...validAttributeTokens
      );
      if (this.check(TokenType.Attribute) || this.check(TokenType.Object)) {
        break;
      }
    }

    attr.updateEnd();
    return attr;
  }

  variable(): Variable {
    let parVariable = this.partialVariable();
    let compVariable = new Variable(
      parVariable,
      parVariable.start,
      parVariable.end
    );
    while (
      this.check(TokenType.ScgVariable) ||
      this.check(TokenType.Variable)
    ) {
      let token = this.peek();
      if (token.start !== parVariable.end) {
        break;
      }
      this.advance();
      parVariable = this.partialVariable();
      compVariable.addParVariable(parVariable);
    }
    compVariable.updateEnd();
    return compVariable;
  }

  partialVariable(): PartialVariable {
    let token = this.previous();
    return new PartialVariable(token.content, token.start, token.end);
  }

  attributeValue(): AttributeValue {
    let token = this.previous();
    return new AttributeValue(
      token.content,
      token.type,
      token.start,
      token.end
    );
  }
}

export class SepticCnfg {
  objects: SepticObject[];

  constructor(objects: SepticObject[]) {
    this.objects = objects;
  }
}

export class SepticBase {
  start: number;
  end: number;

  constructor(start: number = -1, end: number = -1) {
    this.start = start;
    this.end = end;
  }

  updateEnd(): void {
    return;
  }
}

export class SepticObject extends SepticBase {
  type: string;
  variable: Variable | null;
  attributes: Attribute[];

  constructor(
    objectType: string,
    variable: Variable | null,
    start: number = -1,
    end: number = -1
  ) {
    super(start, end);
    this.type = objectType;
    this.variable = variable;
    this.attributes = [];
  }

  addAttribute(attr: Attribute) {
    this.attributes.push(attr);
  }

  updateEnd(): void {
    this.variable?.updateEnd();
    this.attributes.forEach((elem) => {
      elem.updateEnd();
    });
    if (this.attributes.length >= 1) {
      this.end = this.attributes[this.attributes.length - 1].end;
    }
  }
}

export class Attribute extends SepticBase {
  values: AttributeValue[];
  name: string;

  constructor(name: string, start: number = -1, end: number = -1) {
    super(start, end);
    this.values = [];
    this.name = name;
  }

  addValue(value: AttributeValue) {
    this.values.push(value);
  }
  updateEnd(): void {
    this.values.forEach((elem) => {
      elem.updateEnd();
    });
    if (this.values.length >= 1) {
      this.end = this.values[this.values.length - 1].end;
    }
  }
}

export class Variable extends SepticBase {
  parts: PartialVariable[];

  constructor(variable: PartialVariable, start: number = -1, end: number = -1) {
    super(start, end);
    this.parts = [variable];
  }

  id() {
    let id: string = "";
    this.parts.forEach((elem) => {
      id += elem.name;
    });
    return id;
  }

  addParVariable(variable: PartialVariable) {
    this.parts.push(variable);
  }

  updateEnd(): void {
    this.parts.forEach((elem) => {
      elem.updateEnd();
    });
    if (this.parts.length >= 1) {
      this.end = this.parts[this.parts.length - 1].end;
    }
  }
}

export class PartialVariable extends SepticBase {
  name: string;

  constructor(name: string, start: number = -1, end: number = -1) {
    super(start, end);
    this.name = name;
  }
}

export class AttributeValue extends SepticBase {
  value: any;
  type: TokenType;

  constructor(
    value: any,
    type: TokenType,
    start: number = -1,
    end: number = -1
  ) {
    super(start, end);
    this.value = value;
    this.type = type;
  }
}
