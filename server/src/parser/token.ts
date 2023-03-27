export enum TokenType {
  Object,
  Attribute,
  BlockComment,
  LineComment,
  Numeric,
  String,
  Groupmask,
  Bits,
  Skip,
  Unknown,
  Enum,
  Variable,
  ScgVariable,
  EOF,
}

export interface Token {
  type: TokenType;
  start: number;
  end: number;
  content: string;
}
