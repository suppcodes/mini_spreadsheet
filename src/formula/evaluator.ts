import type { ASTNode, CellValueGetter, EvaluationResult } from './types';
import { parseCellRange, getCellsInRange } from '../utils/coordinates';

export class FormulaEvaluator {
  private getCell: CellValueGetter;

  constructor(getCell: CellValueGetter) {
    this.getCell = getCell;
  }

  evaluate(ast: ASTNode): EvaluationResult {
    try {
      return this.evalNode(ast);
    } catch (err: any) {
      if (err.message && err.message.startsWith('#')) {
        return { value: null, error: err.message };
      }
      return { value: null, error: '#ERROR!' };
    }
  }

  private evalNode(node: ASTNode): EvaluationResult {
    switch (node.type) {
      case 'Number':
        return { value: node.value };

      case 'String':
        return { value: node.value };

      case 'Boolean':
        return { value: node.value };

      case 'CellRef': {
        const cell = this.getCell(node.ref);
        if (cell.error) {
          throw new Error(cell.error);
        }
        return { value: cell.value ?? null };
      }

      case 'RangeRef': {
        // Evaluating a range by itself returns an array of values flattened
        return { value: null, error: '#VALUE!' };
      }

      case 'UnaryOp': {
        const arg = this.evalNode(node.argument);
        if (arg.error) throw new Error(arg.error);
        const num = this.toNumber(arg.value);
        if (num === null) throw new Error('#VALUE!');
        return { value: node.op === '-' ? -num : num };
      }

      case 'BinaryOp':
        return this.evalBinaryOp(node.op, node.left, node.right);

      case 'FunctionCall':
        return this.evalFunctionCall(node.name, node.args);

      default:
        throw new Error('#ERROR!');
    }
  }

  private evalBinaryOp(op: string, leftNode: ASTNode, rightNode: ASTNode): EvaluationResult {
    const left = this.evalNode(leftNode);
    if (left.error) throw new Error(left.error);

    const right = this.evalNode(rightNode);
    if (right.error) throw new Error(right.error);

    // Concatenation operator '&'
    if (op === '&') {
      const leftStr = left.value === null ? '' : String(left.value);
      const rightStr = right.value === null ? '' : String(right.value);
      return { value: leftStr + rightStr };
    }

    // Comparison operators
    if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
      const l = left.value;
      const r = right.value;

      // Both null
      if (l === null && r === null) {
        if (op === '=') return { value: true };
        if (op === '<>') return { value: false };
      }

      // Try numeric comparison if both can be numbers
      const numL = this.toNumber(l);
      const numR = this.toNumber(r);

      if (numL !== null && numR !== null) {
        switch (op) {
          case '=': return { value: numL === numR };
          case '<>': return { value: numL !== numR };
          case '<': return { value: numL < numR };
          case '>': return { value: numL > numR };
          case '<=': return { value: numL <= numR };
          case '>=': return { value: numL >= numR };
        }
      }

      // String comparison
      const strL = l === null ? '' : String(l);
      const strR = r === null ? '' : String(r);
      switch (op) {
        case '=': return { value: strL.toUpperCase() === strR.toUpperCase() };
        case '<>': return { value: strL.toUpperCase() !== strR.toUpperCase() };
        case '<': return { value: strL < strR };
        case '>': return { value: strL > strR };
        case '<=': return { value: strL <= strR };
        case '>=': return { value: strL >= strR };
      }
    }

    // Arithmetic operators: +, -, *, /, ^
    const numL = this.toNumber(left.value);
    const numR = this.toNumber(right.value);

    if (numL === null || numR === null) {
      throw new Error('#VALUE!');
    }

    switch (op) {
      case '+':
        return { value: numL + numR };
      case '-':
        return { value: numL - numR };
      case '*':
        return { value: numL * numR };
      case '/':
        if (numR === 0) {
          throw new Error('#DIV/0!');
        }
        return { value: numL / numR };
      case '^':
        return { value: Math.pow(numL, numR) };
      default:
        throw new Error('#ERROR!');
    }
  }

  private evalFunctionCall(name: string, args: ASTNode[]): EvaluationResult {
    switch (name) {
      case 'SUM': {
        const numbers = this.collectNumericValues(args);
        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        return { value: sum };
      }

      case 'AVERAGE': {
        const numbers = this.collectNumericValues(args);
        if (numbers.length === 0) {
          throw new Error('#DIV/0!');
        }
        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        return { value: sum / numbers.length };
      }

      case 'MIN': {
        const numbers = this.collectNumericValues(args);
        if (numbers.length === 0) {
          throw new Error('#VALUE!');
        }
        return { value: Math.min(...numbers) };
      }

      case 'MAX': {
        const numbers = this.collectNumericValues(args);
        if (numbers.length === 0) {
          throw new Error('#VALUE!');
        }
        return { value: Math.max(...numbers) };
      }

      case 'COUNT': {
        const numbers = this.collectNumericValues(args);
        return { value: numbers.length };
      }

      case 'COUNTA': {
        const allVals = this.collectAllValues(args);
        const nonEmpty = allVals.filter((v) => v !== null && v !== '');
        return { value: nonEmpty.length };
      }

      case 'PRODUCT': {
        const numbers = this.collectNumericValues(args);
        if (numbers.length === 0) return { value: 0 };
        const prod = numbers.reduce((acc, curr) => acc * curr, 1);
        return { value: prod };
      }

      case 'IF': {
        if (args.length < 2 || args.length > 3) {
          throw new Error('#ERROR!');
        }
        const condResult = this.evalNode(args[0]);
        if (condResult.error) throw new Error(condResult.error);

        const isTrue = Boolean(condResult.value);
        if (isTrue) {
          return this.evalNode(args[1]);
        } else if (args[2]) {
          return this.evalNode(args[2]);
        }
        return { value: false };
      }

      case 'CONCAT':
      case 'CONCATENATE': {
        const allVals = this.collectAllValues(args);
        return { value: allVals.map((v) => (v === null ? '' : String(v))).join('') };
      }

      case 'ABS': {
        if (args.length !== 1) throw new Error('#ERROR!');
        const val = this.evalNode(args[0]);
        if (val.error) throw new Error(val.error);
        const num = this.toNumber(val.value);
        if (num === null) throw new Error('#VALUE!');
        return { value: Math.abs(num) };
      }

      case 'ROUND': {
        if (args.length < 1 || args.length > 2) throw new Error('#ERROR!');
        const val = this.evalNode(args[0]);
        if (val.error) throw new Error(val.error);
        const num = this.toNumber(val.value);
        if (num === null) throw new Error('#VALUE!');

        let decimals = 0;
        if (args.length === 2) {
          const decVal = this.evalNode(args[1]);
          if (decVal.error) throw new Error(decVal.error);
          const d = this.toNumber(decVal.value);
          if (d === null) throw new Error('#VALUE!');
          decimals = Math.floor(d);
        }

        const factor = Math.pow(10, decimals);
        return { value: Math.round(num * factor) / factor };
      }

      default:
        throw new Error('#NAME?');
    }
  }

  /**
   * Helper that collects all numeric values from arguments, unpacking ranges and cell references.
   * Note: In Excel/Google Sheets, empty cells and text strings inside ranges are skipped in SUM/AVERAGE/MIN/MAX.
   * But direct numeric literals or numeric cell values are included.
   */
  private collectNumericValues(args: ASTNode[]): number[] {
    const numbers: number[] = [];

    for (const arg of args) {
      if (arg.type === 'RangeRef') {
        const range = parseCellRange(arg.raw);
        if (!range) throw new Error('#REF!');
        const cells = getCellsInRange(range);
        for (const cellKey of cells) {
          const cell = this.getCell(cellKey);
          if (cell.error) throw new Error(cell.error);
          if (cell.value !== null && cell.value !== '') {
            const num = this.toNumber(cell.value);
            if (num !== null) {
              numbers.push(num);
            }
          }
        }
      } else if (arg.type === 'CellRef') {
        const cell = this.getCell(arg.ref);
        if (cell.error) throw new Error(cell.error);
        if (cell.value !== null && cell.value !== '') {
          const num = this.toNumber(cell.value);
          if (num !== null) {
            numbers.push(num);
          }
        }
      } else {
        const res = this.evalNode(arg);
        if (res.error) throw new Error(res.error);
        if (res.value !== null && res.value !== '') {
          const num = this.toNumber(res.value);
          if (num !== null) {
            numbers.push(num);
          } else {
            // Direct argument that cannot be parsed as number is #VALUE!
            throw new Error('#VALUE!');
          }
        }
      }
    }

    return numbers;
  }

  /**
   * Collects all scalar values from arguments, unpacking ranges.
   */
  private collectAllValues(args: ASTNode[]): (string | number | boolean | null)[] {
    const values: (string | number | boolean | null)[] = [];

    for (const arg of args) {
      if (arg.type === 'RangeRef') {
        const range = parseCellRange(arg.raw);
        if (!range) throw new Error('#REF!');
        const cells = getCellsInRange(range);
        for (const cellKey of cells) {
          const cell = this.getCell(cellKey);
          if (cell.error) throw new Error(cell.error);
          values.push(cell.value);
        }
      } else {
        const res = this.evalNode(arg);
        if (res.error) throw new Error(res.error);
        values.push(res.value);
      }
    }

    return values;
  }

  private toNumber(val: any): number | null {
    if (typeof val === 'number') {
      return isNaN(val) ? null : val;
    }
    if (typeof val === 'boolean') {
      return val ? 1 : 0;
    }
    if (val === null || val === undefined || val === '') {
      return 0;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return 0;
      const num = Number(trimmed);
      return isNaN(num) ? null : num;
    }
    return null;
  }
}
