export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'CELL_REF'
  | 'RANGE_REF'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export type ASTNode =
  | NumberNode
  | StringNode
  | BooleanNode
  | CellRefNode
  | RangeRefNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode;

export interface NumberNode {
  type: 'Number';
  value: number;
}

export interface StringNode {
  type: 'String';
  value: string;
}

export interface BooleanNode {
  type: 'Boolean';
  value: boolean;
}

export interface CellRefNode {
  type: 'CellRef';
  ref: string; // e.g. "A1"
}

export interface RangeRefNode {
  type: 'RangeRef';
  raw: string; // e.g. "A1:B5"
  startRef: string;
  endRef: string;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  op: '+' | '-';
  argument: ASTNode;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  op: string; // "+", "-", "*", "/", "^", "&", "=", "<>", "<", ">", "<=", ">="
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string; // e.g. "SUM", "AVERAGE"
  args: ASTNode[];
}

export interface EvaluationResult {
  value: string | number | boolean | null;
  error?: string | null;
}

export type CellValueGetter = (cellKey: string) => EvaluationResult;
