import { describe, it, expect } from 'vitest';
import { FormulaParser } from '../formula/parser';
import { FormulaEvaluator } from '../formula/evaluator';
import type { EvaluationResult } from '../formula/types';

describe('Formula Parser & Evaluator', () => {
  const parser = new FormulaParser();

  const evaluateFormula = (
    formula: string,
    cellMap: Record<string, { value: any; error?: string | null }> = {}
  ): EvaluationResult => {
    const ast = parser.parse(formula);
    const getCell = (key: string) => {
      const c = cellMap[key];
      if (!c) return { value: null };
      return { value: c.value, error: c.error };
    };
    const evaluator = new FormulaEvaluator(getCell);
    return evaluator.evaluate(ast);
  };

  describe('Basic Arithmetic & Precedence', () => {
    it('evaluates simple addition and subtraction', () => {
      expect(evaluateFormula('=10 + 20').value).toBe(30);
      expect(evaluateFormula('=50 - 15').value).toBe(35);
      expect(evaluateFormula('=10 + 20 - 5').value).toBe(25);
    });

    it('evaluates multiplication and division with precedence', () => {
      expect(evaluateFormula('=2 + 3 * 4').value).toBe(14);
      expect(evaluateFormula('=(2 + 3) * 4').value).toBe(20);
      expect(evaluateFormula('=100 / 4 / 5').value).toBe(5);
    });

    it('evaluates exponents', () => {
      expect(evaluateFormula('=2 ^ 3').value).toBe(8);
      expect(evaluateFormula('=3 ^ 2 + 1').value).toBe(10);
    });

    it('evaluates unary minus and plus', () => {
      expect(evaluateFormula('=-10 + 5').value).toBe(-5);
      expect(evaluateFormula('=-(10 + 5)').value).toBe(-15);
      expect(evaluateFormula('=+25').value).toBe(25);
    });

    it('handles division by zero', () => {
      const res = evaluateFormula('=100 / 0');
      expect(res.error).toBe('#DIV/0!');
    });
  });

  describe('Cell References', () => {
    it('evaluates formulas referencing other cells', () => {
      const cells = {
        A1: { value: 10 },
        B1: { value: 20 },
      };
      expect(evaluateFormula('=A1 + B1', cells).value).toBe(30);
      expect(evaluateFormula('=A1 * 3', cells).value).toBe(30);
      expect(evaluateFormula('=(B1 - A1) * 2', cells).value).toBe(20);
    });

    it('treats empty referenced cell as 0 in arithmetic', () => {
      const cells = {
        A1: { value: 15 },
      };
      expect(evaluateFormula('=A1 + B1', cells).value).toBe(15);
    });

    it('propagates error from referenced cell', () => {
      const cells = {
        A1: { value: null, error: '#DIV/0!' },
        B1: { value: 10 },
      };
      const res = evaluateFormula('=A1 + B1', cells);
      expect(res.error).toBe('#DIV/0!');
    });
  });

  describe('String Operations & Comparisons', () => {
    it('evaluates string concatenation with & and CONCAT', () => {
      expect(evaluateFormula('="Hello " & "World"').value).toBe('Hello World');
      expect(evaluateFormula('=CONCAT("Spread", "sheet")').value).toBe('Spreadsheet');
    });

    it('evaluates comparison operators', () => {
      expect(evaluateFormula('=10 = 10').value).toBe(true);
      expect(evaluateFormula('=10 <> 10').value).toBe(false);
      expect(evaluateFormula('=15 > 10').value).toBe(true);
      expect(evaluateFormula('=5 <= 5').value).toBe(true);
      expect(evaluateFormula('=5 < 3').value).toBe(false);
    });
  });

  describe('Mathematical & Statistical Functions', () => {
    it('evaluates SUM with numbers and ranges', () => {
      const cells = {
        A1: { value: 10 },
        A2: { value: 20 },
        A3: { value: 30 },
        A4: { value: 'Text' }, // Should be ignored in range sum
      };
      expect(evaluateFormula('=SUM(A1:A3)', cells).value).toBe(60);
      expect(evaluateFormula('=SUM(A1:A4)', cells).value).toBe(60);
      expect(evaluateFormula('=SUM(1, 2, 3, 4, 5)').value).toBe(15);
      expect(evaluateFormula('=SUM(A1, 5, 15)', cells).value).toBe(30);
    });

    it('evaluates AVERAGE with numbers and ranges', () => {
      const cells = {
        A1: { value: 10 },
        A2: { value: 20 },
        A3: { value: 30 },
      };
      expect(evaluateFormula('=AVERAGE(A1:A3)', cells).value).toBe(20);
      expect(evaluateFormula('=AVERAGE(10, 20, 30)').value).toBe(20);
    });

    it('returns #DIV/0! when AVERAGE has 0 numbers', () => {
      const cells = {
        A1: { value: 'Text' },
      };
      expect(evaluateFormula('=AVERAGE(A1)', cells).error).toBe('#DIV/0!');
    });

    it('evaluates MIN and MAX', () => {
      const cells = {
        A1: { value: 45 },
        A2: { value: 12 },
        A3: { value: 89 },
        A4: { value: 3 },
      };
      expect(evaluateFormula('=MIN(A1:A4)', cells).value).toBe(3);
      expect(evaluateFormula('=MAX(A1:A4)', cells).value).toBe(89);
      expect(evaluateFormula('=MIN(10, -5, 20)').value).toBe(-5);
      expect(evaluateFormula('=MAX(10, -5, 20)').value).toBe(20);
    });

    it('evaluates COUNT and COUNTA', () => {
      const cells = {
        A1: { value: 10 },
        A2: { value: 'Hello' },
        A3: { value: 30 },
        A4: { value: null },
      };
      expect(evaluateFormula('=COUNT(A1:A4)', cells).value).toBe(2);
      expect(evaluateFormula('=COUNTA(A1:A4)', cells).value).toBe(3);
    });

    it('evaluates IF condition', () => {
      expect(evaluateFormula('=IF(10 > 5, "Yes", "No")').value).toBe('Yes');
      expect(evaluateFormula('=IF(10 < 5, "Yes", "No")').value).toBe('No');
    });

    it('evaluates ABS and ROUND', () => {
      expect(evaluateFormula('=ABS(-42)').value).toBe(42);
      expect(evaluateFormula('=ROUND(12.3456, 2)').value).toBe(12.35);
      expect(evaluateFormula('=ROUND(12.3456)').value).toBe(12);
    });
  });

  describe('Error Handling', () => {
    it('returns #NAME? for unrecognized functions', () => {
      expect(evaluateFormula('=UNKNOWNFUNCTION(1, 2)').error).toBe('#NAME?');
    });

    it('returns #ERROR! for syntax errors', () => {
      expect(() => parser.parse('=10 + + +')).toThrow();
      expect(() => parser.parse('=(10 + 20')).toThrow();
    });
  });
});
