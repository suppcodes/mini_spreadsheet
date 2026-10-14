import { createContext } from 'react';
import type {
  CellAddress,
  CellRange,
  CellMap,
  CellFormatting,
  DependencyNodeInfo,
} from '../types/spreadsheet';

export interface SpreadsheetContextType {
  // State
  cells: CellMap;
  selectedCell: CellAddress;
  selectedRange: CellRange | null;
  editingCell: CellAddress | null;
  editValue: string;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  showDepViewer: boolean;

  // Actions
  selectCell: (addr: CellAddress) => void;
  selectRange: (range: CellRange | null) => void;
  startEditing: (addr?: CellAddress, initialValue?: string) => void;
  updateEditValue: (val: string) => void;
  commitEdit: (navDirection?: 'none' | 'down' | 'up' | 'right' | 'left', overrideValue?: string) => void;
  setCellValue: (key: string, raw: string) => void;
  cancelEdit: () => void;
  setCellFormat: (format: Partial<CellFormatting>) => void;
  clearSelectedCells: () => void;
  undo: () => void;
  redo: () => void;
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: (clipboardText?: string) => Promise<void>;
  fillRange: (sourceRange: CellRange, targetRange: CellRange) => void;
  exportCsvData: (onlySelection?: boolean) => void;
  importCsvData: (csvText: string) => void;
  resetSpreadsheet: () => void;
  loadDemoData: () => void;
  setShowDepViewer: (show: boolean) => void;
  getDependencyInfo: () => DependencyNodeInfo[];
}

export const SpreadsheetContext = createContext<SpreadsheetContextType | null>(null);
