import type { ASTNode, Token, TokenType } from './types';
import { Tokenizer } from './tokenizer';

export class FormulaParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(input: string): ASTNode {
    const tokenizer = new Tokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.current = 0;

    if (this.isAtEnd() || this.peek().type === 'EOF') {
      throw new Error('Empty formula');
    }

    const ast = this.expression();

    if (!this.isAtEnd() && this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }

    return ast;
  }

  private expression(): ASTNode {
    return this.comparison();
  }

  private comparison(): ASTNode {
    let expr = this.concat();

    while (this.matchOperator('=', '<>', '<', '>', '<=', '>=')) {
      const op = this.previous().value;
      const right = this.concat();
      expr = {
        type: 'BinaryOp',
        op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private concat(): ASTNode {
    let expr = this.additive();

    while (this.matchOperator('&')) {
      const op = this.previous().value;
      const right = this.additive();
      expr = {
        type: 'BinaryOp',
        op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private additive(): ASTNode {
    let expr = this.multiplicative();

    while (this.matchOperator('+', '-')) {
      const op = this.previous().value;
      const right = this.multiplicative();
      expr = {
        type: 'BinaryOp',
        op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private multiplicative(): ASTNode {
    let expr = this.power();

    while (this.matchOperator('*', '/')) {
      const op = this.previous().value;
      const right = this.power();
      expr = {
        type: 'BinaryOp',
        op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private power(): ASTNode {
    const expr = this.unary();

    if (this.matchOperator('^')) {
      const op = this.previous().value;
      const right = this.power(); // Right-associative
      return {
        type: 'BinaryOp',
        op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.matchOperator('+', '-')) {
      const op = this.previous().value as '+' | '-';
      const right = this.unary();
      return {
        type: 'UnaryOp',
        op,
        argument: right,
      };
    }

    return this.primary();
  }

  private primary(): ASTNode {
    if (this.matchType('NUMBER')) {
      return {
        type: 'Number',
        value: parseFloat(this.previous().value),
      };
    }

    if (this.matchType('STRING')) {
      return {
        type: 'String',
        value: this.previous().value,
      };
    }

    if (this.matchType('BOOLEAN')) {
      return {
        type: 'Boolean',
        value: this.previous().value.toUpperCase() === 'TRUE',
      };
    }

    if (this.matchType('CELL_REF')) {
      return {
        type: 'CellRef',
        ref: this.previous().value.toUpperCase(),
      };
    }

    if (this.matchType('RANGE_REF')) {
      const raw = this.previous().value.toUpperCase();
      const [startRef, endRef] = raw.split(':');
      return {
        type: 'RangeRef',
        raw,
        startRef,
        endRef,
      };
    }

    if (this.matchType('IDENTIFIER')) {
      const functionName = this.previous().value.toUpperCase();
      if (!this.matchType('LPAREN')) {
        throw new Error(`Expected '(' after function name ${functionName}`);
      }

      const args: ASTNode[] = [];
      if (!this.checkType('RPAREN')) {
        do {
          args.push(this.expression());
        } while (this.matchType('COMMA'));
      }

      if (!this.matchType('RPAREN')) {
        throw new Error(`Expected ')' after function arguments for ${functionName}`);
      }

      return {
        type: 'FunctionCall',
        name: functionName,
        args,
      };
    }

    if (this.matchType('LPAREN')) {
      const expr = this.expression();
      if (!this.matchType('RPAREN')) {
        throw new Error("Expected ')' after expression");
      }
      return expr;
    }

    throw new Error(
      `Unexpected token '${this.peek().value || 'EOF'}' at position ${this.peek().pos}`
    );
  }

  private matchOperator(...ops: string[]): boolean {
    if (this.checkType('OPERATOR') && ops.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchType(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.checkType(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private checkType(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.tokens[this.current].type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', pos: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
