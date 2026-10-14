import { describe, it, expect } from 'vitest';
import { translateFormula } from '../formula/formulaTranslator';

describe('Formula Translation (Fill Handle & Copy/Paste)', () => {
  it('translates relative cell references down by rows', () => {
    expect(translateFormula('=A1 * 2', 1, 0)).toBe('=A2 * 2');
    expect(translateFormula('=A1 + B1', 2, 0)).toBe('=A3 + B3');
  });

  it('translates relative cell references across columns', () => {
    expect(translateFormula('=A1 * 2', 0, 1)).toBe('=B1 * 2');
    expect(translateFormula('=A1 + A2', 0, 2)).toBe('=C1 + C2');
  });

  it('translates cell ranges correctly', () => {
    expect(translateFormula('=SUM(A1:A5)', 1, 0)).toBe('=SUM(A2:A6)');
    expect(translateFormula('=SUM(A1:A5)', 0, 1)).toBe('=SUM(B1:B5)');
    expect(translateFormula('=AVERAGE(B2:D4)', 3, 2)).toBe('=AVERAGE(D5:F7)');
  });

  it('does not modify non-formula values', () => {
    expect(translateFormula('12345', 1, 1)).toBe('12345');
    expect(translateFormula('Hello World', 2, 2)).toBe('Hello World');
  });

  it('keeps formula unchanged if offset is zero', () => {
    expect(translateFormula('=SUM(A1:B5) + C1', 0, 0)).toBe('=SUM(A1:B5) + C1');
  });
});
