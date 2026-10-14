import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSpreadsheet } from '../../context/useSpreadsheet';
import { DEFAULT_ROW_COUNT, DEFAULT_COL_COUNT, DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } from '../../context/spreadsheetConstants';
import { Cell } from './Cell';
import {
  colIndexToLabel,
  addressToCellKey,
  isCellInRange,
  getNormalizedRange,
} from '../../utils/coordinates';
import type { CellAddress, CellRange } from '../../types/spreadsheet';

const ROW_HEADER_WIDTH = 48;
const COL_HEADER_HEIGHT = 28;
const OVERSCAN = 6;

export const VirtualGrid: React.FC = () => {
  const {
    cells,
    selectedCell,
    selectedRange,
    editingCell,
    editValue,
    columnWidths,
    rowHeights,
    selectCell,
    selectRange,
    startEditing,
    updateEditValue,
    commitEdit,
    cancelEdit,
    setColumnWidth,
    setRowHeight,
    clearSelectedCells,
    undo,
    redo,
    copySelection,
    cutSelection,
    pasteSelection,
    fillRange,
  } = useSpreadsheet();

  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll position state
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1000);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Mouse interaction state for Range Selection and Fill Handle
  const isMouseDownRef = useRef(false);
  const selectionStartRef = useRef<CellAddress | null>(null);

  // Fill handle dragging
  const [isDraggingFillHandle, setIsDraggingFillHandle] = useState(false);
  const [fillTargetRange, setFillTargetRange] = useState<CellRange | null>(null);

  // Column / Row resize dragging
  const [resizingCol, setResizingCol] = useState<{ col: number; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ row: number; startY: number; startHeight: number } | null>(null);

  // Measure container viewport on mount & resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportWidth(containerRef.current.clientWidth);
        setViewportHeight(containerRef.current.clientHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute column offset positions
  const { colPositions, totalGridWidth } = useMemo(() => {
    const positions: number[] = [0];
    let total = 0;
    for (let c = 0; c < DEFAULT_COL_COUNT; c++) {
      const w = columnWidths[c] || DEFAULT_COL_WIDTH;
      total += w;
      positions.push(total);
    }
    return { colPositions: positions, totalGridWidth: total };
  }, [columnWidths]);

  // Compute row offset positions
  const { rowPositions, totalGridHeight } = useMemo(() => {
    const positions: number[] = [0];
    let total = 0;
    for (let r = 0; r < DEFAULT_ROW_COUNT; r++) {
      const h = rowHeights[r] || DEFAULT_ROW_HEIGHT;
      total += h;
      positions.push(total);
    }
    return { rowPositions: positions, totalGridHeight: total };
  }, [rowHeights]);

  // Find visible column range (windowing)
  const { startCol, endCol } = useMemo(() => {
    let sc = 0;
    while (sc < DEFAULT_COL_COUNT && colPositions[sc + 1] < scrollLeft) {
      sc++;
    }
    let ec = sc;
    while (ec < DEFAULT_COL_COUNT && colPositions[ec] < scrollLeft + viewportWidth) {
      ec++;
    }
    return {
      startCol: Math.max(0, sc - OVERSCAN),
      endCol: Math.min(DEFAULT_COL_COUNT - 1, ec + OVERSCAN),
    };
  }, [scrollLeft, viewportWidth, colPositions]);

  // Find visible row range (windowing)
  const { startRow, endRow } = useMemo(() => {
    let sr = 0;
    while (sr < DEFAULT_ROW_COUNT && rowPositions[sr + 1] < scrollTop) {
      sr++;
    }
    let er = sr;
    while (er < DEFAULT_ROW_COUNT && rowPositions[er] < scrollTop + viewportHeight) {
      er++;
    }
    return {
      startRow: Math.max(0, sr - OVERSCAN),
      endRow: Math.min(DEFAULT_ROW_COUNT - 1, er + OVERSCAN),
    };
  }, [scrollTop, viewportHeight, rowPositions]);

  // Scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Keyboard navigation & Shortcuts handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // If currently editing, only Escape or special keys should be handled globally
      if (editingCell) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      // Check Ctrl / Meta shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          copySelection();
          return;
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          cutSelection();
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          pasteSelection();
          return;
        }
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          selectRange({
            start: { col: 0, row: 0 },
            end: { col: DEFAULT_COL_COUNT - 1, row: DEFAULT_ROW_COUNT - 1 },
          });
          return;
        }
      }

      // Clear cell contents
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearSelectedCells();
        return;
      }

      // Start editing with F2 or Enter
      if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        startEditing();
        return;
      }

      // Arrow navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        e.preventDefault();

        let deltaCol = 0;
        let deltaRow = 0;

        if (e.key === 'ArrowUp') deltaRow = -1;
        if (e.key === 'ArrowDown') deltaRow = 1;
        if (e.key === 'ArrowLeft') deltaCol = -1;
        if (e.key === 'ArrowRight') deltaCol = 1;
        if (e.key === 'Tab') {
          deltaCol = e.shiftKey ? -1 : 1;
        }

        if (e.shiftKey && e.key.startsWith('Arrow')) {
          // Range expansion
          const currentEnd = selectedRange ? selectedRange.end : selectedCell;
          const newEnd: CellAddress = {
            col: Math.max(0, Math.min(DEFAULT_COL_COUNT - 1, currentEnd.col + deltaCol)),
            row: Math.max(0, Math.min(DEFAULT_ROW_COUNT - 1, currentEnd.row + deltaRow)),
          };
          selectRange({ start: selectedCell, end: newEnd });
        } else {
          // Single cell move
          const newCol = Math.max(0, Math.min(DEFAULT_COL_COUNT - 1, selectedCell.col + deltaCol));
          const newRow = Math.max(0, Math.min(DEFAULT_ROW_COUNT - 1, selectedCell.row + deltaRow));
          selectCell({ col: newCol, row: newRow });
        }
        return;
      }

      // Type printable character directly into cell
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEditing(selectedCell, e.key);
      }
    },
    [
      editingCell,
      selectedCell,
      selectedRange,
      cancelEdit,
      undo,
      redo,
      copySelection,
      cutSelection,
      pasteSelection,
      clearSelectedCells,
      startEditing,
      selectCell,
      selectRange,
    ]
  );

  // Cell mouse down
  const handleCellMouseDown = (col: number, row: number, e: React.MouseEvent) => {
    containerRef.current?.focus();
    if (editingCell) {
      commitEdit('none');
    }

    if (e.shiftKey) {
      // Shift+Click extends range
      selectRange({ start: selectedCell, end: { col, row } });
    } else {
      isMouseDownRef.current = true;
      selectionStartRef.current = { col, row };
      selectCell({ col, row });
    }
  };

  // Cell mouse enter (while dragging range)
  const handleCellMouseEnter = (col: number, row: number) => {
    if (isDraggingFillHandle) {
      // Calculate extended fill range
      const baseRange: CellRange = selectedRange || {
        start: selectedCell,
        end: selectedCell,
      };
      const bounds = getNormalizedRange(baseRange);

      const extendedCol = Math.max(bounds.endCol, col);
      const extendedRow = Math.max(bounds.endRow, row);

      setFillTargetRange({
        start: { col: bounds.startCol, row: bounds.startRow },
        end: { col: extendedCol, row: extendedRow },
      });
      return;
    }

    if (isMouseDownRef.current && selectionStartRef.current) {
      const start = selectionStartRef.current;
      if (start.col !== col || start.row !== row) {
        selectRange({ start, end: { col, row } });
      }
    }
  };

  // Global mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      selectionStartRef.current = null;

      if (isDraggingFillHandle) {
        setIsDraggingFillHandle(false);
        if (fillTargetRange) {
          const sourceRange: CellRange = selectedRange || {
            start: selectedCell,
            end: selectedCell,
          };
          fillRange(sourceRange, fillTargetRange);
          setFillTargetRange(null);
        }
      }

      if (resizingCol) setResizingCol(null);
      if (resizingRow) setResizingRow(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        const delta = e.clientX - resizingCol.startX;
        const newWidth = Math.max(40, resizingCol.startWidth + delta);
        setColumnWidth(resizingCol.col, newWidth);
      }
      if (resizingRow) {
        const delta = e.clientY - resizingRow.startY;
        const newHeight = Math.max(20, resizingRow.startHeight + delta);
        setRowHeight(resizingRow.row, newHeight);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    isDraggingFillHandle,
    fillTargetRange,
    selectedCell,
    selectedRange,
    fillRange,
    resizingCol,
    resizingRow,
    setColumnWidth,
    setRowHeight,
  ]);

  // Compute selection outline box coordinates
  const activeSelectionBounds = useMemo(() => {
    const range: CellRange = fillTargetRange || selectedRange || {
      start: selectedCell,
      end: selectedCell,
    };
    const bounds = getNormalizedRange(range);

    const left = colPositions[bounds.startCol];
    const top = rowPositions[bounds.startRow];
    const width = colPositions[bounds.endCol + 1] - left;
    const height = rowPositions[bounds.endRow + 1] - top;

    return {
      left,
      top,
      width,
      height,
      endCol: bounds.endCol,
      endRow: bounds.endRow,
    };
  }, [selectedCell, selectedRange, fillTargetRange, colPositions, rowPositions]);

  // Handle Fill Handle mouse down
  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingFillHandle(true);
  };

  return (
    <div
      ref={containerRef}
      className="virtual-grid-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      role="grid"
      aria-label="Spreadsheet Grid"
    >
      <div
        className="virtual-grid-canvas"
        style={{
          width: `${totalGridWidth + ROW_HEADER_WIDTH}px`,
          height: `${totalGridHeight + COL_HEADER_HEIGHT}px`,
        }}
      >
        {/* Top-Left Corner Cell */}
        <div
          className="grid-corner-cell"
          style={{ width: `${ROW_HEADER_WIDTH}px`, height: `${COL_HEADER_HEIGHT}px` }}
          onClick={() => {
            selectRange({
              start: { col: 0, row: 0 },
              end: { col: DEFAULT_COL_COUNT - 1, row: DEFAULT_ROW_COUNT - 1 },
            });
          }}
          title="Select all cells"
        />

        {/* Sticky Column Headers */}
        <div
          className="sticky-col-headers"
          style={{
            left: `${ROW_HEADER_WIDTH}px`,
            height: `${COL_HEADER_HEIGHT}px`,
            width: `${totalGridWidth}px`,
          }}
        >
          {Array.from({ length: endCol - startCol + 1 }, (_, i) => {
            const c = startCol + i;
            const left = colPositions[c];
            const width = columnWidths[c] || DEFAULT_COL_WIDTH;
            const isColSelected =
              selectedCell.col === c ||
              (selectedRange &&
                c >= Math.min(selectedRange.start.col, selectedRange.end.col) &&
                c <= Math.max(selectedRange.start.col, selectedRange.end.col));

            return (
              <div
                key={`col-hdr-${c}`}
                className={`col-header ${isColSelected ? 'header-highlighted' : ''}`}
                style={{
                  transform: `translateX(${left}px)`,
                  width: `${width}px`,
                  height: `${COL_HEADER_HEIGHT}px`,
                }}
                onClick={() => {
                  selectRange({
                    start: { col: c, row: 0 },
                    end: { col: c, row: DEFAULT_ROW_COUNT - 1 },
                  });
                }}
              >
                <span>{colIndexToLabel(c)}</span>
                {/* Column Resize Handle */}
                <div
                  className="col-resize-handle"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingCol({ col: c, startX: e.clientX, startWidth: width });
                  }}
                  title="Drag to resize column width"
                />
              </div>
            );
          })}
        </div>

        {/* Sticky Row Headers */}
        <div
          className="sticky-row-headers"
          style={{
            top: `${COL_HEADER_HEIGHT}px`,
            width: `${ROW_HEADER_WIDTH}px`,
            height: `${totalGridHeight}px`,
          }}
        >
          {Array.from({ length: endRow - startRow + 1 }, (_, i) => {
            const r = startRow + i;
            const top = rowPositions[r];
            const height = rowHeights[r] || DEFAULT_ROW_HEIGHT;
            const isRowSelected =
              selectedCell.row === r ||
              (selectedRange &&
                r >= Math.min(selectedRange.start.row, selectedRange.end.row) &&
                r <= Math.max(selectedRange.start.row, selectedRange.end.row));

            return (
              <div
                key={`row-hdr-${r}`}
                className={`row-header ${isRowSelected ? 'header-highlighted' : ''}`}
                style={{
                  transform: `translateY(${top}px)`,
                  width: `${ROW_HEADER_WIDTH}px`,
                  height: `${height}px`,
                }}
                onClick={() => {
                  selectRange({
                    start: { col: 0, row: r },
                    end: { col: DEFAULT_COL_COUNT - 1, row: r },
                  });
                }}
              >
                <span>{r + 1}</span>
                {/* Row Resize Handle */}
                <div
                  className="row-resize-handle"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingRow({ row: r, startY: e.clientY, startHeight: height });
                  }}
                  title="Drag to resize row height"
                />
              </div>
            );
          })}
        </div>

        {/* Virtualized Cell Rows */}
        <div
          className="grid-cells-area"
          style={{
            left: `${ROW_HEADER_WIDTH}px`,
            top: `${COL_HEADER_HEIGHT}px`,
            width: `${totalGridWidth}px`,
            height: `${totalGridHeight}px`,
          }}
        >
          {Array.from({ length: endRow - startRow + 1 }, (_, rIdx) => {
            const r = startRow + rIdx;
            const rowTop = rowPositions[r];
            const rowHeight = rowHeights[r] || DEFAULT_ROW_HEIGHT;

            return (
              <div
                key={`row-chunk-${r}`}
                className="grid-row-chunk"
                style={{
                  transform: `translateY(${rowTop}px)`,
                  height: `${rowHeight}px`,
                }}
              >
                {Array.from({ length: endCol - startCol + 1 }, (_, cIdx) => {
                  const c = startCol + cIdx;
                  const colLeft = colPositions[c];
                  const colWidth = columnWidths[c] || DEFAULT_COL_WIDTH;
                  const key = addressToCellKey({ col: c, row: r });
                  const cellData = cells[key];

                  const isSelected = selectedCell.col === c && selectedCell.row === r;
                  const inRange = Boolean(
                    selectedRange && isCellInRange({ col: c, row: r }, selectedRange)
                  );
                  const isEditingThis =
                    Boolean(editingCell && editingCell.col === c && editingCell.row === r);

                  return (
                    <div
                      key={key}
                      style={{
                        position: 'absolute',
                        transform: `translateX(${colLeft}px)`,
                      }}
                      onMouseEnter={() => handleCellMouseEnter(c, r)}
                    >
                      <Cell
                        col={c}
                        row={r}
                        cellKey={key}
                        data={cellData}
                        width={colWidth}
                        height={rowHeight}
                        isSelected={isSelected}
                        isInRange={inRange}
                        isEditing={isEditingThis}
                        editValue={editValue}
                        onSelect={(e) => handleCellMouseDown(c, r, e)}
                        onDoubleClick={() => startEditing({ col: c, row: r })}
                        onEditChange={updateEditValue}
                        onEditCommit={commitEdit}
                        onEditCancel={cancelEdit}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Selection Box Outline */}
          <div
            className={`selection-bounding-box ${isDraggingFillHandle ? 'fill-dragging' : ''}`}
            style={{
              left: `${activeSelectionBounds.left}px`,
              top: `${activeSelectionBounds.top}px`,
              width: `${activeSelectionBounds.width}px`,
              height: `${activeSelectionBounds.height}px`,
            }}
          >
            {/* Fill Handle Square (Google Sheets style) */}
            {!editingCell && (
              <div
                className="fill-handle"
                onMouseDown={handleFillHandleMouseDown}
                title="Drag to auto-fill formula or values"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
