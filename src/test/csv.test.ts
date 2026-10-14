import { describe, it, expect } from 'vitest';
import { exportToCsv, parseCsv, escapeCsvField } from '../utils/csv';
import type { CellMap, CellRange } from '../types/spreadsheet';

describe('CSV Utilities', () => {
  it('escapes fields containing commas, quotes, and newlines', () => {
    expect(escapeCsvField('Hello')).toBe('Hello');
    expect(escapeCsvField('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsvField('She said "hi"')).toBe('"She said ""hi"""');
    expect(escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
  });

  it('parses basic CSV content correctly', () => {
    const csv = 'Name,Age,City\nAlice,30,New York\nBob,25,San Francisco';
    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      ['Name', 'Age', 'City'],
      ['Alice', '30', 'New York'],
      ['Bob', '25', 'San Francisco'],
    ]);
  });

  it('parses CSV with quoted fields and commas inside quotes', () => {
    const csv = 'Product,"Price, USD",Notes\nWidget,"1,200.50","Top, Best seller"';
    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      ['Product', 'Price, USD', 'Notes'],
      ['Widget', '1,200.50', 'Top, Best seller'],
    ]);
  });

  it('parses CSV with escaped double quotes', () => {
    const csv = 'Title,Quote\nBook,"He said ""Hello!"""';
    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      ['Title', 'Quote'],
      ['Book', 'He said "Hello!"'],
    ]);
  });

  it('exports cell map to CSV', () => {
    const cells: CellMap = {
      A1: { raw: 'Product', value: 'Product', display: 'Product' },
      B1: { raw: 'Revenue', value: 'Revenue', display: 'Revenue' },
      A2: { raw: 'Apples', value: 'Apples', display: 'Apples' },
      B2: { raw: '100', value: 100, display: '100' },
    };

    const range: CellRange = {
      start: { col: 0, row: 0 },
      end: { col: 1, row: 1 },
    };

    const csv = exportToCsv(cells, false, range);
    expect(csv).toBe('Product,Revenue\r\nApples,100');
  });
});
