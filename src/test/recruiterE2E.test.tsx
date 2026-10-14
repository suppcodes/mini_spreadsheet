import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpreadsheetProvider } from '../context/SpreadsheetContext';
import { Spreadsheet } from '../components/Spreadsheet';

describe('Recruiter Comprehensive End-to-End Evaluation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderApp = () => {
    return render(
      <SpreadsheetProvider>
        <Spreadsheet />
      </SpreadsheetProvider>
    );
  };

  it('1. Spreadsheet Grid: Renders labeled rows, columns, and starter demo data', () => {
    renderApp();

    // Verify application header & title
    expect(screen.getByText('Mini Spreadsheet')).toBeTruthy();

    // Verify labeled columns
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1);

    // Verify initial demo data rendered
    expect(screen.getByText('Quarterly Sales & Expenses Report')).toBeTruthy();
    expect(screen.getByText('Product Revenue')).toBeTruthy();
  });

  it('2. Cell Navigation & Formula Bar: Updates coordinate and value on cell selection', () => {
    renderApp();

    const nameBox = screen.getByLabelText('Active Cell Address') as HTMLInputElement;
    expect(nameBox.value).toBe('A1');

    // Click on cell B4
    const cellB4 = screen.getByText('12500');
    fireEvent.click(cellB4);

    // Name box should reflect B4
    expect(nameBox.value).toBe('B4');

    // Formula bar input should show B4 value
    const formulaInput = screen.getByLabelText('Formula input bar') as HTMLInputElement;
    expect(formulaInput.value).toBe('12500');
  });

  it('3. Formula Recalculation: Updates downstream dependencies automatically', () => {
    renderApp();

    // Select B4 and edit it
    const cellB4 = screen.getByText('12500');
    fireEvent.doubleClick(cellB4);

    const cellInput = screen.getByLabelText('Editing cell B4') as HTMLInputElement;
    fireEvent.change(cellInput, { target: { value: '20000' } });
    fireEvent.keyDown(cellInput, { key: 'Enter' });

    // Cell B4 should now be 20000
    expect(screen.getByText('20000')).toBeTruthy();

    // Annual Total in F4 was =SUM(B4:E4) = 12500+14200+16800+19500 = 63000
    // With 20000 it should now be 20000+14200+16800+19500 = 70500
    expect(screen.getByText('70500')).toBeTruthy();
  });

  it('4. Error States: Displays clear error codes for invalid formulas and division by zero', () => {
    renderApp();

    // Edit cell A1 to =100 / 0
    const cellA1 = screen.getByText('Quarterly Sales & Expenses Report');
    fireEvent.doubleClick(cellA1);

    const cellInput = screen.getByLabelText('Editing cell A1') as HTMLInputElement;
    fireEvent.change(cellInput, { target: { value: '=100 / 0' } });
    fireEvent.keyDown(cellInput, { key: 'Enter' });

    expect(screen.getByText('#DIV/0!')).toBeTruthy();
  });

  it('5. Circular Reference Detection: Prevents infinite loops and displays #CIRCULAR!', () => {
    renderApp();

    // Set A1 to self-reference =A1 + 10
    const cellA1 = screen.getByText('Quarterly Sales & Expenses Report');
    fireEvent.doubleClick(cellA1);

    const cellInput = screen.getByLabelText('Editing cell A1') as HTMLInputElement;
    fireEvent.change(cellInput, { target: { value: '=A1 + 10' } });
    fireEvent.keyDown(cellInput, { key: 'Enter' });

    // Must be safely tagged #CIRCULAR! without freezing
    expect(screen.getByText('#CIRCULAR!')).toBeTruthy();
  });

  it('6. History: Undo and Redo operations restore states accurately', () => {
    renderApp();

    // Initially undo is disabled
    const undoBtn = screen.getByLabelText('Undo') as HTMLButtonElement;
    const redoBtn = screen.getByLabelText('Redo') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);

    // Edit B4
    const cellB4 = screen.getByText('12500');
    fireEvent.doubleClick(cellB4);
    const cellInput = screen.getByLabelText('Editing cell B4') as HTMLInputElement;
    fireEvent.change(cellInput, { target: { value: '99999' } });
    fireEvent.keyDown(cellInput, { key: 'Enter' });

    expect(screen.getByText('99999')).toBeTruthy();
    expect(undoBtn.disabled).toBe(false);

    // Click Undo
    act(() => {
      undoBtn.click();
    });
    expect(screen.getByText('12500')).toBeTruthy();
    expect(redoBtn.disabled).toBe(false);

    // Click Redo
    act(() => {
      redoBtn.click();
    });
    expect(screen.getByText('99999')).toBeTruthy();
  });

  it('7. Formatting Toolbar: Toggles Bold, Italic, Underline on cells', () => {
    renderApp();

    const cellB4 = screen.getByText('12500');
    fireEvent.click(cellB4);

    const boldBtn = screen.getByLabelText('Bold text');
    act(() => {
      boldBtn.click();
    });

    const parentCell = cellB4.closest('.grid-cell') as HTMLElement;
    expect(parentCell.style.fontWeight).toBe('600');
  });

  it('8. Dependency Graph Inspector: Opens modal and presents calculation strategy', () => {
    renderApp();

    const depBtn = screen.getByTitle('View Dependency Graph & Calculation Strategy');
    act(() => {
      depBtn.click();
    });

    // Check modal contents
    expect(screen.getByText('Dependency Graph & Recalculation Strategy')).toBeTruthy();
    expect(screen.getByText('Recalculation Strategy (Directed Acyclic Graph)')).toBeTruthy();
    expect(screen.getByText(/Kahn's algorithm/i)).toBeTruthy();

    // Close modal
    const closeBtn = screen.getByText('Close Inspector');
    act(() => {
      closeBtn.click();
    });

    expect(screen.queryByText('Dependency Graph & Recalculation Strategy')).toBeNull();
  });

  it('9. Status Bar: Displays active coordinates and shortcuts guide', () => {
    renderApp();

    expect(screen.getByText(/1000 Rows × 26 Columns/)).toBeTruthy();
    expect(screen.getByText(/Arrows: Move/)).toBeTruthy();
  });
});
