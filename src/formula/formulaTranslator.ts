import { cellKeyToAddress, addressToCellKey } from '../utils/coordinates';

/**
 * Translates relative cell references and range references in a formula by rowOffset and colOffset.
 * For example:
 * translateFormula("=A1*2", 1, 0) -> "=A2*2" (shifted 1 row down)
 * translateFormula("=SUM(A1:A5)", 0, 1) -> "=SUM(B1:B5)" (shifted 1 col right)
 */
export function translateFormula(
  formula: string,
  rowOffset: number,
  colOffset: number
): string {
  if (!formula.trim().startsWith('=')) {
    return formula; // Not a formula, returns original
  }

  if (rowOffset === 0 && colOffset === 0) {
    return formula;
  }

  // Regex to match cell references and range references
  // Matches e.g. A1:B5 or A1
  // We use word boundaries and avoid matching function names like SUM(
  const refPattern = /([A-Z]+[1-9][0-9]*)(?::([A-Z]+[1-9][0-9]*))?/g;

  return formula.replace(refPattern, (match, singleRef, secondRef) => {
    if (secondRef) {
      // It's a range ref, e.g. A1:B5
      const startAddr = cellKeyToAddress(singleRef);
      const endAddr = cellKeyToAddress(secondRef);
      if (!startAddr || !endAddr) return match;

      const newStartCol = Math.max(0, startAddr.col + colOffset);
      const newStartRow = Math.max(0, startAddr.row + rowOffset);
      const newEndCol = Math.max(0, endAddr.col + colOffset);
      const newEndRow = Math.max(0, endAddr.row + rowOffset);

      const newStartKey = addressToCellKey({ col: newStartCol, row: newStartRow });
      const newEndKey = addressToCellKey({ col: newEndCol, row: newEndRow });

      return `${newStartKey}:${newEndKey}`;
    } else {
      // It's a single cell ref, e.g. A1
      const addr = cellKeyToAddress(singleRef);
      if (!addr) return match;

      const newCol = Math.max(0, addr.col + colOffset);
      const newRow = Math.max(0, addr.row + rowOffset);

      return addressToCellKey({ col: newCol, row: newRow });
    }
  });
}
