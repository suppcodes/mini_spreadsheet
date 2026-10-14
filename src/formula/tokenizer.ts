import type { Token } from './types';

export class Tokenizer {
  private input: string;
  private pos = 0;

  constructor(input: string) {
    this.input = input.trim().startsWith('=') ? input.trim().slice(1) : input.trim();
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      // Skip whitespace
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }

      // Strings in quotes: "..."
      if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch));
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.peek(1)))) {
        tokens.push(this.readNumber());
        continue;
      }

      // Parentheses & commas
      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(', pos: this.pos++ });
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')', pos: this.pos++ });
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',', pos: this.pos++ });
        continue;
      }

      // Two-character operators: <=, >=, <>
      const twoChar = this.input.slice(this.pos, this.pos + 2);
      if (twoChar === '<=' || twoChar === '>=' || twoChar === '<>') {
        tokens.push({ type: 'OPERATOR', value: twoChar, pos: this.pos });
        this.pos += 2;
        continue;
      }

      // Single-character operators
      if (['+', '-', '*', '/', '^', '&', '=', '<', '>'].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: ch, pos: this.pos++ });
        continue;
      }

      // Identifiers, Cell Refs, Range Refs, Booleans
      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.readWordOrRef());
        continue;
      }

      // If we encounter an unexpected character:
      throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
    }

    tokens.push({ type: 'EOF', value: '', pos: this.pos });
    return tokens;
  }

  private peek(offset = 0): string {
    return this.input[this.pos + offset] || '';
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.pos++; // skip opening quote
    let str = '';

    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
        this.pos++;
        str += this.input[this.pos++];
      } else {
        str += this.input[this.pos++];
      }
    }

    if (this.pos >= this.input.length) {
      throw new Error(`Unterminated string starting at position ${start}`);
    }
    this.pos++; // skip closing quote

    return { type: 'STRING', value: str, pos: start };
  }

  private readNumber(): Token {
    const start = this.pos;
    let numStr = '';
    let hasDot = false;

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (/[0-9]/.test(ch)) {
        numStr += ch;
        this.pos++;
      } else if (ch === '.' && !hasDot) {
        hasDot = true;
        numStr += ch;
        this.pos++;
      } else {
        break;
      }
    }

    return { type: 'NUMBER', value: numStr, pos: start };
  }

  private readWordOrRef(): Token {
    const start = this.pos;
    let word = '';

    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      word += this.input[this.pos++];
    }

    const upper = word.toUpperCase();

    // Check if followed by colon ':' which indicates range reference: e.g. A1:B10
    if (this.peek(0) === ':') {
      const isFirstPartCellRef = /^[A-Z]+[1-9][0-9]*$/.test(upper);
      if (isFirstPartCellRef) {
        this.pos++; // consume ':'
        let secondPart = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          secondPart += this.input[this.pos++];
        }
        const secondUpper = secondPart.toUpperCase();
        if (/^[A-Z]+[1-9][0-9]*$/.test(secondUpper)) {
          return {
            type: 'RANGE_REF',
            value: `${upper}:${secondUpper}`,
            pos: start,
          };
        } else {
          throw new Error(`Invalid range reference at position ${start}: ${word}:${secondPart}`);
        }
      }
    }

    // Check if it's a boolean
    if (upper === 'TRUE' || upper === 'FALSE') {
      return { type: 'BOOLEAN', value: upper, pos: start };
    }

    // Check if it's a single cell reference: e.g. A1, BC99
    if (/^[A-Z]+[1-9][0-9]*$/.test(upper)) {
      return { type: 'CELL_REF', value: upper, pos: start };
    }

    // Otherwise it's a function identifier: SUM, AVERAGE, IF, etc.
    return { type: 'IDENTIFIER', value: upper, pos: start };
  }
}
