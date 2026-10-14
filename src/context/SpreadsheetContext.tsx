import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type {
  CellAddress,
  CellRange,
  CellMap,
  CellFormatting,
  HistorySnapshot,
  DependencyNodeInfo,
} from '../types/spreadsheet';
import {
  addressToCellKey,
  getNormalizedRange,
  getCellsInRange,
  clampAddress,
} from '../utils/coordinates';
import { DependencyGraph } from '../formula/dependency';
import { translateFormula } from '../formula/formulaTranslator';
import { exportToCsv, parseCsv, downloadFile } from '../utils/csv';
import {
  STORAGE_KEY,
  DEFAULT_ROW_COUNT,
  DEFAULT_COL_COUNT,
  STARTER_DEMO_CELLS,
} from './spreadsheetConstants';
import { SpreadsheetContext } from './SpreadsheetContextType';

export function SpreadsheetProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<CellMap>({});
  const [selectedCell, setSelectedCell] = useState<CellAddress>({ col: 0, row: 0 });
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [showDepViewer, setShowDepViewer] = useState<boolean>(false);

  // Internal clipboard store for copying formulas and cell formats
  const internalClipboardRef = useRef<{
    width: number;
    height: number;
    data: { relativeCol: number; relativeRow: number; raw: string; format?: CellFormatting }[];
  } | null>(null);

  // Singleton Dependency Engine
  const depGraphRef = useRef<DependencyGraph>(new DependencyGraph());

  // Capture history snapshot
  const pushHistory = useCallback(
    (currentCells = cells, currentCols = columnWidths, currentRows = rowHeights) => {
      setUndoStack((prev) => [
        ...prev.slice(-49), // Keep last 50 snapshots
        {
          cells: { ...currentCells },
          columnWidths: { ...currentCols },
          rowHeights: { ...currentRows },
        },
      ]);
      setRedoStack([]); // Clear redo on new action
    },
    [cells, columnWidths, rowHeights]
  );

  // Recalculate helper
  const recalculate = useCallback((rawCells: CellMap, affectedKeys?: string[]): CellMap => {
    return depGraphRef.current.recalculateSpreadsheet(rawCells, affectedKeys);
  }, []);

  // Load starter demo data
  const loadDemoData = useCallback(() => {
    const recalculated = depGraphRef.current.recalculateSpreadsheet(STARTER_DEMO_CELLS);
    setCells(recalculated);
    setColumnWidths({ 0: 200, 1: 110, 2: 110, 3: 110, 4: 110, 5: 140 });
  }, []);

  // Initial load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cells) {
          const recalculated = depGraphRef.current.recalculateSpreadsheet(parsed.cells);
          setCells(recalculated);
        }
        if (parsed.columnWidths) setColumnWidths(parsed.columnWidths);
        if (parsed.rowHeights) setRowHeights(parsed.rowHeights);
        if (parsed.lastSavedAt) setLastSavedAt(parsed.lastSavedAt);
        return;
      }
    } catch (e) {
      console.warn('Failed to restore spreadsheet from localStorage:', e);
    }

    // If no saved data, load starter demo
    loadDemoData();
  }, [loadDemoData]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      try {
        setIsSaving(true);
        const payload = {
          cells,
          columnWidths,
          rowHeights,
          lastSavedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        if (active) {
          setLastSavedAt(payload.lastSavedAt);
        }
      } catch (err) {
        console.warn('Auto-save to localStorage failed:', err);
      } finally {
        if (active) {
          setIsSaving(false);
        }
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cells, columnWidths, rowHeights]);

  // Select Cell
  const selectCell = useCallback((addr: CellAddress) => {
    const clamped = clampAddress(addr, DEFAULT_COL_COUNT, DEFAULT_ROW_COUNT);
    setSelectedCell(clamped);
    setSelectedRange(null);
  }, []);

  // Select Range
  const selectRange = useCallback((range: CellRange | null) => {
    if (range) {
      const start = clampAddress(range.start, DEFAULT_COL_COUNT, DEFAULT_ROW_COUNT);
      const end = clampAddress(range.end, DEFAULT_COL_COUNT, DEFAULT_ROW_COUNT);
      setSelectedRange({ start, end });
    } else {
      setSelectedRange(null);
    }
  }, []);

  // Start Editing
  const startEditing = useCallback(
    (addr?: CellAddress, initialValue?: string) => {
      const target = addr || selectedCell;
      const key = addressToCellKey(target);
      const existing = cells[key];
      const val = initialValue !== undefined ? initialValue : existing ? existing.raw : '';
      setEditingCell(target);
      setEditValue(val);
    },
    [selectedCell, cells]
  );

  // Update Edit Value
  const updateEditValue = useCallback((val: string) => {
    setEditValue(val);
  }, []);

  // Commit Edit
  const commitEdit = useCallback(
    (
      navDirection: 'none' | 'down' | 'up' | 'right' | 'left' = 'none',
      overrideValue?: string
    ) => {
      if (!editingCell && overrideValue === undefined) return;
      const targetCell = editingCell || selectedCell;
      if (!targetCell) return;

      const key = addressToCellKey(targetCell);
      const currentCell = cells[key];
      const prevRaw = currentCell ? currentCell.raw : '';
      const finalVal = overrideValue !== undefined ? overrideValue : editValue;

      if (prevRaw !== finalVal) {
        pushHistory();
        const updatedCells: CellMap = {
          ...cells,
          [key]: {
            raw: finalVal,
            value: null,
            display: finalVal,
            format: currentCell?.format,
          },
        };

        const recalculated = recalculate(updatedCells, [key]);
        setCells(recalculated);
      }

      const prevEditing = targetCell;
      setEditingCell(null);

      // Handle navigation after edit
      if (navDirection === 'down') {
        selectCell({ col: prevEditing.col, row: prevEditing.row + 1 });
      } else if (navDirection === 'up') {
        selectCell({ col: prevEditing.col, row: Math.max(0, prevEditing.row - 1) });
      } else if (navDirection === 'right') {
        selectCell({ col: prevEditing.col + 1, row: prevEditing.row });
      } else if (navDirection === 'left') {
        selectCell({ col: Math.max(0, prevEditing.col - 1), row: prevEditing.row });
      }
    },
    [editingCell, selectedCell, editValue, cells, pushHistory, recalculate, selectCell]
  );

  // Set Cell Value directly
  const setCellValue = useCallback(
    (key: string, raw: string) => {
      pushHistory();
      const currentCell = cells[key];
      const updatedCells: CellMap = {
        ...cells,
        [key]: {
          raw,
          value: null,
          display: raw,
          format: currentCell?.format,
        },
      };
      const recalculated = recalculate(updatedCells, [key]);
      setCells(recalculated);
    },
    [cells, pushHistory, recalculate]
  );

  // Cancel Edit
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Format active cell or selected range
  const setCellFormat = useCallback(
    (formatUpdates: Partial<CellFormatting>) => {
      pushHistory();
      const updatedCells: CellMap = { ...cells };

      const targetKeys = selectedRange
        ? getCellsInRange(selectedRange)
        : [addressToCellKey(selectedCell)];

      for (const k of targetKeys) {
        const existing = updatedCells[k] || {
          raw: '',
          value: null,
          display: '',
        };
        updatedCells[k] = {
          ...existing,
          format: {
            ...existing.format,
            ...formatUpdates,
          },
        };
      }

      setCells(updatedCells);
    },
    [cells, selectedCell, selectedRange, pushHistory]
  );

  // Clear selected cells
  const clearSelectedCells = useCallback(() => {
    pushHistory();
    const updatedCells: CellMap = { ...cells };
    const targetKeys = selectedRange
      ? getCellsInRange(selectedRange)
      : [addressToCellKey(selectedCell)];

    for (const k of targetKeys) {
      if (updatedCells[k]) {
        updatedCells[k] = {
          raw: '',
          value: null,
          display: '',
          format: updatedCells[k].format,
        };
      }
    }

    const recalculated = recalculate(updatedCells, targetKeys);
    setCells(recalculated);
  }, [cells, selectedCell, selectedRange, pushHistory, recalculate]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [
      ...prev,
      {
        cells: { ...cells },
        columnWidths: { ...columnWidths },
        rowHeights: { ...rowHeights },
      },
    ]);

    setUndoStack(newUndoStack);
    const recalculated = recalculate(previous.cells);
    setCells(recalculated);
    setColumnWidths(previous.columnWidths);
    setRowHeights(previous.rowHeights);
  }, [undoStack, cells, columnWidths, rowHeights, recalculate]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [
      ...prev,
      {
        cells: { ...cells },
        columnWidths: { ...columnWidths },
        rowHeights: { ...rowHeights },
      },
    ]);

    setRedoStack(newRedoStack);
    const recalculated = recalculate(next.cells);
    setCells(recalculated);
    setColumnWidths(next.columnWidths);
    setRowHeights(next.rowHeights);
  }, [redoStack, cells, columnWidths, rowHeights, recalculate]);

  // Set Column Width
  const setColumnWidth = useCallback((col: number, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [col]: Math.max(40, width),
    }));
  }, []);

  // Set Row Height
  const setRowHeight = useCallback((row: number, height: number) => {
    setRowHeights((prev) => ({
      ...prev,
      [row]: Math.max(20, height),
    }));
  }, []);

  // Copy selection to clipboard
  const copySelection = useCallback(() => {
    const range: CellRange = selectedRange || {
      start: selectedCell,
      end: selectedCell,
    };
    const bounds = getNormalizedRange(range);

    const clipboardItems: {
      relativeCol: number;
      relativeRow: number;
      raw: string;
      format?: CellFormatting;
    }[] = [];

    const tsvRows: string[] = [];

    for (let r = bounds.startRow; r <= bounds.endRow; r++) {
      const rowTexts: string[] = [];
      for (let c = bounds.startCol; c <= bounds.endCol; c++) {
        const key = addressToCellKey({ col: c, row: r });
        const cell = cells[key];
        const raw = cell?.raw || '';
        const display = cell?.display || '';
        clipboardItems.push({
          relativeCol: c - bounds.startCol,
          relativeRow: r - bounds.startRow,
          raw,
          format: cell?.format ? { ...cell.format } : undefined,
        });
        rowTexts.push(display || raw);
      }
      tsvRows.push(rowTexts.join('\t'));
    }

    internalClipboardRef.current = {
      width: bounds.width,
      height: bounds.height,
      data: clipboardItems,
    };

    const tsvString = tsvRows.join('\r\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvString).catch(() => {});
    }
  }, [cells, selectedCell, selectedRange]);

  // Cut selection
  const cutSelection = useCallback(() => {
    copySelection();
    clearSelectedCells();
  }, [copySelection, clearSelectedCells]);

  // Paste selection
  const pasteSelection = useCallback(
    async (clipboardText?: string) => {
      pushHistory();
      const updatedCells: CellMap = { ...cells };
      const affectedKeys: string[] = [];
      const baseCol = selectedCell.col;
      const baseRow = selectedCell.row;

      let textToPaste = clipboardText;
      if (!textToPaste && navigator.clipboard && navigator.clipboard.readText) {
        try {
          textToPaste = await navigator.clipboard.readText();
        } catch {}
      }

      // Check if internal clipboard matches
      const internal = internalClipboardRef.current;

      if (internal && (!textToPaste || internal.data.length > 0)) {
        // Paste from internal clipboard with formula translation!
        for (const item of internal.data) {
          const targetCol = baseCol + item.relativeCol;
          const targetRow = baseRow + item.relativeRow;
          if (targetCol >= DEFAULT_COL_COUNT || targetRow >= DEFAULT_ROW_COUNT) continue;

          const targetKey = addressToCellKey({ col: targetCol, row: targetRow });
          affectedKeys.push(targetKey);

          // Translate relative formula references
          const translatedRaw = translateFormula(
            item.raw,
            item.relativeRow,
            item.relativeCol
          );

          updatedCells[targetKey] = {
            raw: translatedRaw,
            value: null,
            display: translatedRaw,
            format: item.format ? { ...item.format } : updatedCells[targetKey]?.format,
          };
        }
      } else if (textToPaste) {
        // External TSV/CSV paste
        const rows = textToPaste.split(/\r?\n/).filter((r, idx, arr) => {
          return idx < arr.length - 1 || r.length > 0;
        });

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const cols = rows[rIdx].split('\t');
          for (let cIdx = 0; cIdx < cols.length; cIdx++) {
            const targetCol = baseCol + cIdx;
            const targetRow = baseRow + rIdx;
            if (targetCol >= DEFAULT_COL_COUNT || targetRow >= DEFAULT_ROW_COUNT) continue;

            const targetKey = addressToCellKey({ col: targetCol, row: targetRow });
            affectedKeys.push(targetKey);

            const val = cols[cIdx];
            updatedCells[targetKey] = {
              raw: val,
              value: null,
              display: val,
              format: updatedCells[targetKey]?.format,
            };
          }
        }
      }

      if (affectedKeys.length > 0) {
        const recalculated = recalculate(updatedCells, affectedKeys);
        setCells(recalculated);
      }
    },
    [cells, selectedCell, pushHistory, recalculate]
  );

  // Fill handle / drag to copy
  const fillRange = useCallback(
    (sourceRange: CellRange, targetRange: CellRange) => {
      pushHistory();
      const updatedCells: CellMap = { ...cells };
      const affectedKeys: string[] = [];

      const srcBounds = getNormalizedRange(sourceRange);
      const tgtBounds = getNormalizedRange(targetRange);

      // Determine drag direction (down, up, right, left)
      for (let r = tgtBounds.startRow; r <= tgtBounds.endRow; r++) {
        for (let c = tgtBounds.startCol; c <= tgtBounds.endCol; c++) {
          // If already in source range, skip
          if (
            r >= srcBounds.startRow &&
            r <= srcBounds.endRow &&
            c >= srcBounds.startCol &&
            c <= srcBounds.endCol
          ) {
            continue;
          }

          // Compute matching source cell cyclically
          const relRow = (r - srcBounds.startRow) % srcBounds.height;
          const relCol = (c - srcBounds.startCol) % srcBounds.width;
          const srcCol = srcBounds.startCol + (relRow < 0 ? relRow + srcBounds.height : relRow);
          const srcRow = srcBounds.startRow + (relCol < 0 ? relCol + srcBounds.width : relCol);

          const srcKey = addressToCellKey({ col: srcCol, row: srcRow });
          const srcCell = cells[srcKey];

          const targetKey = addressToCellKey({ col: c, row: r });
          affectedKeys.push(targetKey);

          if (!srcCell || !srcCell.raw) {
            updatedCells[targetKey] = {
              raw: '',
              value: null,
              display: '',
              format: srcCell?.format,
            };
          } else {
            const rowOffset = r - srcRow;
            const colOffset = c - srcCol;
            const translatedRaw = translateFormula(srcCell.raw, rowOffset, colOffset);

            updatedCells[targetKey] = {
              raw: translatedRaw,
              value: null,
              display: translatedRaw,
              format: srcCell.format ? { ...srcCell.format } : undefined,
            };
          }
        }
      }

      const recalculated = recalculate(updatedCells, affectedKeys);
      setCells(recalculated);
      setSelectedRange(targetRange);
    },
    [cells, pushHistory, recalculate]
  );

  // Export CSV
  const exportCsvData = useCallback(
    (onlySelection = false) => {
      const csv = exportToCsv(
        cells,
        false,
        onlySelection && selectedRange ? selectedRange : undefined
      );
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadFile(csv, `spreadsheet-${timestamp}.csv`, 'text/csv;charset=utf-8;');
    },
    [cells, selectedRange]
  );

  // Import CSV
  const importCsvData = useCallback(
    (csvText: string) => {
      pushHistory();
      const parsedRows = parseCsv(csvText);
      const updatedCells: CellMap = {};
      const affectedKeys: string[] = [];

      for (let r = 0; r < parsedRows.length; r++) {
        if (r >= DEFAULT_ROW_COUNT) break;
        const row = parsedRows[r];
        for (let c = 0; c < row.length; c++) {
          if (c >= DEFAULT_COL_COUNT) break;
          const key = addressToCellKey({ col: c, row: r });
          const val = row[c];
          if (val) {
            updatedCells[key] = {
              raw: val,
              value: null,
              display: val,
            };
            affectedKeys.push(key);
          }
        }
      }

      const recalculated = recalculate(updatedCells, affectedKeys);
      setCells(recalculated);
      setSelectedCell({ col: 0, row: 0 });
      setSelectedRange(null);
    },
    [pushHistory, recalculate]
  );

  // Reset Spreadsheet
  const resetSpreadsheet = useCallback(() => {
    pushHistory();
    depGraphRef.current.clear();
    setCells({});
    setSelectedCell({ col: 0, row: 0 });
    setSelectedRange(null);
    setEditingCell(null);
    setEditValue('');
  }, [pushHistory]);

  const getDependencyInfo = useCallback((): DependencyNodeInfo[] => {
    return depGraphRef.current.getGraphInfo(cells);
  }, [cells]);

  return (
    <SpreadsheetContext.Provider
      value={{
        cells,
        selectedCell,
        selectedRange,
        editingCell,
        editValue,
        columnWidths,
        rowHeights,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        isSaving,
        lastSavedAt,
        showDepViewer,
        selectCell,
        selectRange,
        startEditing,
        updateEditValue,
        commitEdit,
        setCellValue,
        cancelEdit,
        setCellFormat,
        clearSelectedCells,
        undo,
        redo,
        setColumnWidth,
        setRowHeight,
        copySelection,
        cutSelection,
        pasteSelection,
        fillRange,
        exportCsvData,
        importCsvData,
        resetSpreadsheet,
        loadDemoData,
        setShowDepViewer,
        getDependencyInfo,
      }}
    >
      {children}
    </SpreadsheetContext.Provider>
  );
}
