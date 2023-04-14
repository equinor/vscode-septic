export enum TokenType {
  Object,
  Attribute,
  BlockComment,
  LineComment,
  Numeric,
  String,
  Skip,
  Unknown,
  Variable,
  EOF,
}

export interface Token {
  type: TokenType;
  start: number;
  end: number;
  content: string;
}
