import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SpreadsheetProvider } from '../context/SpreadsheetContext';
import { useSpreadsheet } from '../context/useSpreadsheet';

const TestConsumer: React.FC = () => {
  const {
    cells,
    selectedCell,
    selectedRange,
    canUndo,
    canRedo,
    selectCell,
    selectRange,
    setCellValue,
    undo,
    redo,
    setCellFormat,
    clearSelectedCells,
    resetSpreadsheet,
  } = useSpreadsheet();

  return (
    <div>
      <div data-testid="selected-cell">{`${selectedCell.col},${selectedCell.row}`}</div>
      <div data-testid="can-undo">{canUndo ? 'yes' : 'no'}</div>
      <div data-testid="can-redo">{canRedo ? 'yes' : 'no'}</div>
      <div data-testid="cell-A1-display">{cells['A1']?.display || ''}</div>
      <div data-testid="cell-A1-format">{JSON.stringify(cells['A1']?.format || {})}</div>
      <div data-testid="cell-B1-display">{cells['B1']?.display || ''}</div>
      <div data-testid="selected-range">
        {selectedRange
          ? `${selectedRange.start.col},${selectedRange.start.row}-${selectedRange.end.col},${selectedRange.end.row}`
          : 'none'}
      </div>

      <button onClick={() => selectCell({ col: 1, row: 2 })}>Select B3</button>
      <button onClick={() => selectRange({ start: { col: 0, row: 0 }, end: { col: 1, row: 1 } })}>
        Select Range A1:B2
      </button>
      <button onClick={() => setCellValue('A1', '42')}>Set A1 to 42</button>
      <button onClick={() => setCellValue('B1', '=A1 * 2')}>Set B1 to =A1*2</button>
      <button onClick={() => setCellFormat({ bold: true, align: 'center' })}>
        Format Bold Center
      </button>
      <button onClick={clearSelectedCells}>Clear Cells</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={resetSpreadsheet}>Reset All</button>
    </div>
  );
};

describe('Spreadsheet Context & State Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('selects cells and ranges correctly', () => {
    render(
      <SpreadsheetProvider>
        <TestConsumer />
      </SpreadsheetProvider>
    );

    act(() => {
      screen.getByText('Select B3').click();
    });
    expect(screen.getByTestId('selected-cell').textContent).toBe('1,2');

    act(() => {
      screen.getByText('Select Range A1:B2').click();
    });
    expect(screen.getByTestId('selected-range').textContent).toBe('0,0-1,1');
  });

  it('edits cells, calculates formulas, and supports undo/redo', () => {
    render(
      <SpreadsheetProvider>
        <TestConsumer />
      </SpreadsheetProvider>
    );

    // Set A1 to 42
    act(() => {
      screen.getByText('Set A1 to 42').click();
    });
    expect(screen.getByTestId('cell-A1-display').textContent).toBe('42');
    expect(screen.getByTestId('can-undo').textContent).toBe('yes');

    // Set B1 to =A1 * 2
    act(() => {
      screen.getByText('Set B1 to =A1*2').click();
    });
    expect(screen.getByTestId('cell-B1-display').textContent).toBe('84');

    // Undo B1 edit
    act(() => {
      screen.getByText('Undo').click();
    });
    expect(screen.getByTestId('cell-B1-display').textContent).toBe('');
    expect(screen.getByTestId('can-redo').textContent).toBe('yes');

    // Redo B1 edit
    act(() => {
      screen.getByText('Redo').click();
    });
    expect(screen.getByTestId('cell-B1-display').textContent).toBe('84');
  });

  it('applies formatting and clears cells', () => {
    render(
      <SpreadsheetProvider>
        <TestConsumer />
      </SpreadsheetProvider>
    );

    act(() => {
      screen.getByText('Set A1 to 42').click();
      screen.getByText('Format Bold Center').click();
    });

    const format = JSON.parse(screen.getByTestId('cell-A1-format').textContent || '{}');
    expect(format.bold).toBe(true);
    expect(format.align).toBe('center');

    // Clear cell
    act(() => {
      screen.getByText('Clear Cells').click();
    });
    expect(screen.getByTestId('cell-A1-display').textContent).toBe('');
  });

  it('resets entire spreadsheet cleanly', () => {
    render(
      <SpreadsheetProvider>
        <TestConsumer />
      </SpreadsheetProvider>
    );

    act(() => {
      screen.getByText('Reset All').click();
    });
    expect(screen.getByTestId('cell-A1-display').textContent).toBe('');
    expect(screen.getByTestId('cell-B1-display').textContent).toBe('');
  });
});
