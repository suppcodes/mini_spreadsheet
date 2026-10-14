import { describe, it, expect } from 'vitest';
import {
  colIndexToLabel,
  labelToColIndex,
  cellKeyToAddress,
  addressToCellKey,
  parseCellRange,
  getCellsInRange,
  isCellInRange,
  getNormalizedRange,
} from '../utils/coordinates';

describe('Coordinates and Range Utilities', () => {
  it('converts column index to Excel column label correctly', () => {
    expect(colIndexToLabel(0)).toBe('A');
    expect(colIndexToLabel(1)).toBe('B');
    expect(colIndexToLabel(25)).toBe('Z');
    expect(colIndexToLabel(26)).toBe('AA');
    expect(colIndexToLabel(27)).toBe('AB');
    expect(colIndexToLabel(51)).toBe('AZ');
    expect(colIndexToLabel(52)).toBe('BA');
  });

  it('converts column label to column index correctly', () => {
    expect(labelToColIndex('A')).toBe(0);
    expect(labelToColIndex('B')).toBe(1);
    expect(labelToColIndex('Z')).toBe(25);
    expect(labelToColIndex('AA')).toBe(26);
    expect(labelToColIndex('AB')).toBe(27);
    expect(labelToColIndex('BA')).toBe(52);
    expect(labelToColIndex('')).toBe(-1);
    expect(labelToColIndex('123')).toBe(-1);
  });

  it('parses cell key to address and back', () => {
    expect(cellKeyToAddress('A1')).toEqual({ col: 0, row: 0 });
    expect(cellKeyToAddress('B10')).toEqual({ col: 1, row: 9 });
    expect(cellKeyToAddress('Z100')).toEqual({ col: 25, row: 99 });
    expect(cellKeyToAddress('AA5')).toEqual({ col: 26, row: 4 });
    expect(cellKeyToAddress('INVALID')).toBeNull();

    expect(addressToCellKey({ col: 0, row: 0 })).toBe('A1');
    expect(addressToCellKey({ col: 1, row: 9 })).toBe('B10');
    expect(addressToCellKey({ col: 26, row: 4 })).toBe('AA5');
  });

  it('parses cell ranges correctly', () => {
    const range = parseCellRange('A1:B3');
    expect(range).toEqual({
      start: { col: 0, row: 0 },
      end: { col: 1, row: 2 },
    });
    expect(parseCellRange('A1')).toBeNull();
    expect(parseCellRange('A1:INVALID')).toBeNull();
  });

  it('normalizes range bounds regardless of drag direction', () => {
    const forward = parseCellRange('A1:B3')!;
    const backward = parseCellRange('B3:A1')!;

    const normForward = getNormalizedRange(forward);
    const normBackward = getNormalizedRange(backward);

    expect(normForward.startCol).toBe(0);
    expect(normForward.endCol).toBe(1);
    expect(normForward.startRow).toBe(0);
    expect(normForward.endRow).toBe(2);
    expect(normForward.width).toBe(2);
    expect(normForward.height).toBe(3);

    expect(normBackward).toEqual(normForward);
  });

  it('checks if a cell is inside a range', () => {
    const range = parseCellRange('B2:D4')!;
    expect(isCellInRange({ col: 1, row: 1 }, range)).toBe(true); // B2
    expect(isCellInRange({ col: 2, row: 2 }, range)).toBe(true); // C3
    expect(isCellInRange({ col: 3, row: 3 }, range)).toBe(true); // D4
    expect(isCellInRange({ col: 0, row: 0 }, range)).toBe(false); // A1
    expect(isCellInRange({ col: 4, row: 4 }, range)).toBe(false); // E5
  });

  it('gets all cell keys in range', () => {
    const range = parseCellRange('A1:B2')!;
    const cells = getCellsInRange(range);
    expect(cells).toEqual(['A1', 'B1', 'A2', 'B2']);
  });
});
