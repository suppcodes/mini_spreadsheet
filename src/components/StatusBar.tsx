import React, { useMemo } from 'react';
import { useSpreadsheet } from '../context/useSpreadsheet';
import {
  addressToCellKey,
  getCellsInRange,
  colIndexToLabel,
} from '../utils/coordinates';
import { Keyboard, HelpCircle } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { cells, selectedCell, selectedRange } = useSpreadsheet();

  // Compute live statistics for current selection
  const stats = useMemo(() => {
    const keys = selectedRange
      ? getCellsInRange(selectedRange)
      : [addressToCellKey(selectedCell)];

    let count = 0;
    let numericCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const k of keys) {
      const cell = cells[k];
      if (cell && (cell.raw || cell.display)) {
        count++;
        if (typeof cell.value === 'number') {
          numericCount++;
          sum += cell.value;
          if (cell.value < min) min = cell.value;
          if (cell.value > max) max = cell.value;
        }
      }
    }

    const average = numericCount > 0 ? sum / numericCount : 0;

    return {
      totalCells: keys.length,
      count,
      numericCount,
      sum: Number.isInteger(sum) ? sum : parseFloat(sum.toFixed(4)),
      average: Number.isInteger(average) ? average : parseFloat(average.toFixed(4)),
      min: min !== Infinity ? min : null,
      max: max !== -Infinity ? max : null,
    };
  }, [cells, selectedCell, selectedRange]);

  const activeLabel = `Col ${colIndexToLabel(selectedCell.col)}, Row ${
    selectedCell.row + 1
  } (${addressToCellKey(selectedCell)})`;

  return (
    <footer className="spreadsheet-status-bar" role="status" aria-label="Spreadsheet Status">
      <div className="status-left">
        <span className="status-badge active-cell-badge">{activeLabel}</span>
        <span className="status-text text-muted">1000 Rows × 26 Columns</span>
      </div>

      <div className="status-center">
        <span className="keyboard-hint" title="Spreadsheet Keyboard Navigation">
          <Keyboard size={14} />
          <span>Arrows: Move | Enter/F2: Edit | Tab: Next | Del: Clear | Ctrl+Z/Y: Undo/Redo</span>
        </span>
      </div>

      <div className="status-right">
        {stats.totalCells > 1 && (
          <div className="stats-group">
            <span className="stat-pill" title="Total selected cells">
              <span className="stat-label">COUNT:</span>
              <span className="stat-value">{stats.count}</span>
            </span>
            {stats.numericCount > 0 && (
              <>
                <span className="stat-pill" title="Sum of numeric cells">
                  <span className="stat-label">SUM:</span>
                  <span className="stat-value">{stats.sum}</span>
                </span>
                <span className="stat-pill" title="Average of numeric cells">
                  <span className="stat-label">AVG:</span>
                  <span className="stat-value">{stats.average}</span>
                </span>
                <span className="stat-pill" title="Minimum numeric value">
                  <span className="stat-label">MIN:</span>
                  <span className="stat-value">{stats.min}</span>
                </span>
                <span className="stat-pill" title="Maximum numeric value">
                  <span className="stat-label">MAX:</span>
                  <span className="stat-value">{stats.max}</span>
                </span>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          className="shortcuts-help-btn"
          onClick={() => {
            alert(
              `Keyboard Shortcuts & Features:\n\n` +
              `• Arrow Keys: Navigate cells\n` +
              `• Shift + Arrow Keys: Select range\n` +
              `• Enter: Commit edit and move down (or start editing)\n` +
              `• Shift + Enter: Commit edit and move up\n` +
              `• Tab: Commit edit and move right\n` +
              `• Shift + Tab: Commit edit and move left\n` +
              `• Double Click / F2: Edit active cell\n` +
              `• Delete / Backspace: Clear cell contents\n` +
              `• Escape: Cancel cell editing\n` +
              `• Ctrl+Z: Undo | Ctrl+Y: Redo\n` +
              `• Ctrl+C: Copy | Ctrl+V: Paste | Ctrl+X: Cut\n` +
              `• Ctrl+A: Select all\n` +
              `• Drag bottom-right corner of selection: Auto-fill formulas/values with smart reference translation\n` +
              `• Drag column/row headers edge: Resize column width / row height\n` +
              `• Formulas supported: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, CONCAT, ABS, ROUND, +, -, *, /, ^, &, comparisons`
            );
          }}
          title="View Keyboard Shortcuts & Guide"
          aria-label="Help and shortcuts"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </footer>
  );
};
