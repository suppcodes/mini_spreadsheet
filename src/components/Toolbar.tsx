import React, { useRef } from 'react';
import { useSpreadsheet } from '../context/useSpreadsheet';
import { addressToCellKey } from '../utils/coordinates';
import {
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileDown,
  FileUp,
  RotateCcw,
  Sparkles,
  Network,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    cells,
    selectedCell,
    selectedRange,
    canUndo,
    canRedo,
    isSaving,
    undo,
    redo,
    cutSelection,
    copySelection,
    pasteSelection,
    clearSelectedCells,
    setCellFormat,
    exportCsvData,
    importCsvData,
    resetSpreadsheet,
    loadDemoData,
    setShowDepViewer,
  } = useSpreadsheet();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active cell format
  const activeKey = addressToCellKey(selectedCell);
  const activeCell = cells[activeKey];
  const format = activeCell?.format || {};

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        importCsvData(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="spreadsheet-toolbar" role="toolbar" aria-label="Spreadsheet Actions">
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={cutSelection}
          title="Cut (Ctrl+X)"
          aria-label="Cut selection"
        >
          <Scissors size={16} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={copySelection}
          title="Copy (Ctrl+C)"
          aria-label="Copy selection"
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => pasteSelection()}
          title="Paste (Ctrl+V)"
          aria-label="Paste"
        >
          <ClipboardPaste size={16} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={clearSelectedCells}
          title="Clear cell contents (Delete / Backspace)"
          aria-label="Clear contents"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Formatting controls */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${format.bold ? 'active' : ''}`}
          onClick={() => setCellFormat({ bold: !format.bold })}
          title="Bold (Ctrl+B)"
          aria-label="Bold text"
          aria-pressed={Boolean(format.bold)}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${format.italic ? 'active' : ''}`}
          onClick={() => setCellFormat({ italic: !format.italic })}
          title="Italic (Ctrl+I)"
          aria-label="Italic text"
          aria-pressed={Boolean(format.italic)}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${format.underline ? 'active' : ''}`}
          onClick={() => setCellFormat({ underline: !format.underline })}
          title="Underline (Ctrl+U)"
          aria-label="Underline text"
          aria-pressed={Boolean(format.underline)}
        >
          <Underline size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Text and fill color */}
      <div className="toolbar-group">
        <label className="toolbar-color-label" title="Text Color">
          <span className="color-icon" style={{ color: format.textColor || '#0f172a' }}>
            A
          </span>
          <span
            className="color-bar"
            style={{ backgroundColor: format.textColor || '#0f172a' }}
          />
          <input
            type="color"
            className="sr-only-color"
            value={format.textColor || '#000000'}
            onChange={(e) => setCellFormat({ textColor: e.target.value })}
            aria-label="Choose text color"
          />
        </label>

        <label className="toolbar-color-label" title="Fill Color">
          <span className="fill-icon">🎨</span>
          <span
            className="color-bar"
            style={{ backgroundColor: format.backgroundColor || '#ffffff' }}
          />
          <input
            type="color"
            className="sr-only-color"
            value={format.backgroundColor || '#ffffff'}
            onChange={(e) => setCellFormat({ backgroundColor: e.target.value })}
            aria-label="Choose cell fill background color"
          />
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${format.align === 'left' || !format.align ? 'active' : ''}`}
          onClick={() => setCellFormat({ align: 'left' })}
          title="Align Left"
          aria-label="Align left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${format.align === 'center' ? 'active' : ''}`}
          onClick={() => setCellFormat({ align: 'center' })}
          title="Align Center"
          aria-label="Align center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${format.align === 'right' ? 'active' : ''}`}
          onClick={() => setCellFormat({ align: 'right' })}
          title="Align Right"
          aria-label="Align right"
        >
          <AlignRight size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* CSV & Operations */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn text-btn"
          onClick={() => exportCsvData(false)}
          title="Export Spreadsheet to CSV"
        >
          <FileDown size={15} />
          <span>Export CSV</span>
        </button>
        {selectedRange && (
          <button
            type="button"
            className="toolbar-btn text-btn"
            onClick={() => exportCsvData(true)}
            title="Export Selected Cells to CSV"
          >
            <FileDown size={15} />
            <span>Selection CSV</span>
          </button>
        )}
        <label className="toolbar-btn text-btn cursor-pointer" title="Import CSV File">
          <FileUp size={15} />
          <span>Import CSV</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            aria-label="Upload CSV File"
          />
        </label>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn text-btn"
          onClick={loadDemoData}
          title="Load Sample Sales & Budget Data"
        >
          <Sparkles size={15} />
          <span>Demo Data</span>
        </button>
        <button
          type="button"
          className="toolbar-btn text-btn"
          onClick={() => {
            if (window.confirm('Are you sure you want to clear the entire spreadsheet?')) {
              resetSpreadsheet();
            }
          }}
          title="Clear / Reset Entire Spreadsheet"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn text-btn dep-btn"
          onClick={() => setShowDepViewer(true)}
          title="View Dependency Graph & Calculation Strategy"
        >
          <Network size={16} />
          <span>Dependency Graph</span>
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Persistence indicator */}
      <div className="save-status-badge" title="Automatically saved to browser LocalStorage">
        {isSaving ? (
          <>
            <Loader2 size={13} className="spin-icon" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={13} className="text-green-600" />
            <span>Saved in Browser</span>
          </>
        )}
      </div>
    </header>
  );
};
