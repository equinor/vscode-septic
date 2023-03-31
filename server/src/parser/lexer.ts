import {
  ATTRIBUTE_REGEX,
  OBJECT_REGEX,
  BLOCK_COMMENT_REGEX,
  LINE_COMMENT_REGEX,
  STRING_REGEX,
  NUMERIC_REGEX,
  GROUPMASK_REGEX,
  BITS_REGEX,
  SKIP_REGEX,
  UNKNOWN_REGEX,
  VARIABLE_REGEX,
  SCG_VARIABLE_REGEX,
  ENUMS_REGEX,
} from "./regex";

import { CancellationToken } from "vscode-languageserver";
import { Token, TokenType } from "./token";

/* Order in list matter.
    Groupmask and Bits needs to come before Numeric.
    Attribute and Object needs to come before Variable.
    Unknown should always come last. 
*/
const REGEX_LIST = [
  { type: TokenType.LineComment, regex: LINE_COMMENT_REGEX },
  { type: TokenType.BlockComment, regex: BLOCK_COMMENT_REGEX },
  { type: TokenType.String, regex: STRING_REGEX },
  { type: TokenType.Groupmask, regex: GROUPMASK_REGEX },
  { type: TokenType.Bits, regex: BITS_REGEX },
  { type: TokenType.Attribute, regex: ATTRIBUTE_REGEX },
  { type: TokenType.Object, regex: OBJECT_REGEX },
  { type: TokenType.Numeric, regex: NUMERIC_REGEX },
  { type: TokenType.Enum, regex: ENUMS_REGEX },
  { type: TokenType.Variable, regex: VARIABLE_REGEX },
  { type: TokenType.ScgVariable, regex: SCG_VARIABLE_REGEX },
  { type: TokenType.Skip, regex: SKIP_REGEX },
  { type: TokenType.Unknown, regex: UNKNOWN_REGEX },
];

export function tokenize(
  input: string,
  token: CancellationToken | undefined = undefined
): Token[] {
  let tokens: Token[] = [];
  let curpos: number = 0;
  while (curpos < input.length) {
    if (token?.isCancellationRequested) {
      return [];
    }
    let temp = input.slice(curpos);
    for (let i = 0; i < REGEX_LIST.length; i++) {
      let element = REGEX_LIST[i];
      let match = temp.match(element.regex);
      if (!match) {
        continue;
      }
      let lengthMatch = match[0].length;
      if (
        element.type === TokenType.Skip ||
        element.type === TokenType.LineComment ||
        element.type === TokenType.BlockComment
      ) {
        curpos += lengthMatch;
        break;
      }
      let token: Token;
      if (
        element.type === TokenType.Object ||
        element.type === TokenType.Attribute ||
        element.type === TokenType.String ||
        element.type === TokenType.ScgVariable
      ) {
        token = {
          type: element.type,
          start: curpos,
          end: curpos + lengthMatch,
          content: match[1],
        };
      } else {
        token = {
          type: element.type,
          start: curpos,
          end: curpos + lengthMatch,
          content: match[0],
        };
      }
      tokens.push(token);
      curpos += lengthMatch;
      break;
    }
  }
  tokens.push({
    type: TokenType.EOF,
    start: curpos,
    end: curpos,
    content: "\0",
  });
  return tokens;
}
