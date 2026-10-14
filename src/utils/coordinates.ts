import type { CellAddress, CellRange } from '../types/spreadsheet';

/**
 * Converts a 0-indexed column number to an Excel-style column label (e.g. 0 -> "A", 25 -> "Z", 26 -> "AA").
 */
export function colIndexToLabel(col: number): string {
  if (col < 0) return '';
  let label = '';
  let num = col;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

/**
 * Converts an Excel-style column label to a 0-indexed column number (e.g. "A" -> 0, "Z" -> 25, "AA" -> 26).
 */
export function labelToColIndex(label: string): number {
  const upper = label.trim().toUpperCase();
  if (!upper || !/^[A-Z]+$/.test(upper)) return -1;
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

/**
 * Parses a cell key string like "A1" or "BC14" into a CellAddress { col, row }.
 * Returns null if the format is invalid.
 */
export function cellKeyToAddress(key: string): CellAddress | null {
  const match = key.trim().toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) return null;
  const col = labelToColIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  if (col < 0 || row < 0) return null;
  return { col, row };
}

/**
 * Converts a CellAddress { col, row } into a cell key string like "A1".
 */
export function addressToCellKey(addr: CellAddress): string {
  return `${colIndexToLabel(addr.col)}${addr.row + 1}`;
}

/**
 * Parses a range string like "A1:B10" into a CellRange { start, end }.
 */
export function parseCellRange(rangeStr: string): CellRange | null {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return null;
  const start = cellKeyToAddress(parts[0]);
  const end = cellKeyToAddress(parts[1]);
  if (!start || !end) return null;
  return { start, end };
}

/**
 * Returns normalized bounding box bounds: min and max for both columns and rows.
 */
export function getNormalizedRange(range: CellRange) {
  const minCol = Math.min(range.start.col, range.end.col);
  const maxCol = Math.max(range.start.col, range.end.col);
  const minRow = Math.min(range.start.row, range.end.row);
  const maxRow = Math.max(range.start.row, range.end.row);
  return {
    startCol: minCol,
    endCol: maxCol,
    startRow: minRow,
    endRow: maxRow,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

/**
 * Checks if a given cell address is inside a range.
 */
export function isCellInRange(addr: CellAddress, range: CellRange): boolean {
  const bounds = getNormalizedRange(range);
  return (
    addr.col >= bounds.startCol &&
    addr.col <= bounds.endCol &&
    addr.row >= bounds.startRow &&
    addr.row <= bounds.endRow
  );
}

/**
 * Returns an array of all cell keys (e.g. ["A1", "A2", "B1", "B2"]) within a range.
 */
export function getCellsInRange(range: CellRange): string[] {
  const bounds = getNormalizedRange(range);
  const keys: string[] = [];
  for (let r = bounds.startRow; r <= bounds.endRow; r++) {
    for (let c = bounds.startCol; c <= bounds.endCol; c++) {
      keys.push(addressToCellKey({ col: c, row: r }));
    }
  }
  return keys;
}

/**
 * Clamps a cell address within the given bounds.
 */
export function clampAddress(
  addr: CellAddress,
  maxCols: number,
  maxRows: number
): CellAddress {
  return {
    col: Math.max(0, Math.min(addr.col, maxCols - 1)),
    row: Math.max(0, Math.min(addr.row, maxRows - 1)),
  };
}
