export interface CellAddress {
  col: number; // 0-indexed: 0 = A, 1 = B, etc.
  row: number; // 0-indexed: 0 = Row 1, 1 = Row 2, etc.
}

export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export type TextAlignment = 'left' | 'center' | 'right';

export interface CellFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  align?: TextAlignment;
}

export interface CellData {
  raw: string;                 // The formula or literal entered by user, e.g. "=SUM(A1:B2)" or "100"
  value: string | number | boolean | null; // The computed result
  display: string;             // Text shown in the cell
  error?: string | null;       // Error tag if invalid: "#ERROR!", "#REF!", "#DIV/0!", "#VALUE!", "#CIRCULAR!"
  format?: CellFormatting;
}

export type CellMap = Record<string, CellData>; // key is e.g. "A1", "C12"

export interface SpreadsheetDimensions {
  rowCount: number;
  colCount: number;
}

export interface SpreadsheetState {
  cells: CellMap;
  selectedCell: CellAddress;
  selectedRange: CellRange | null;
  editingCell: CellAddress | null;
  editValue: string;
  columnWidths: Record<number, number>; // colIndex -> width in px
  rowHeights: Record<number, number>;   // rowIndex -> height in px
  lastSavedAt: number | null;
}

export interface HistorySnapshot {
  cells: CellMap;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface FormulaError {
  type: 'ERROR' | 'REF' | 'DIV0' | 'VALUE' | 'CIRCULAR' | 'NAME';
  message: string;
}

export interface DependencyNodeInfo {
  cellKey: string;
  precedents: string[]; // Cells that this cell depends on
  dependents: string[]; // Cells that depend on this cell
  hasCycle: boolean;
  rawFormula?: string;
  evaluatedValue?: string | number | boolean | null;
  error?: string | null;
}
