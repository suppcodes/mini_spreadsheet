import { useState, useRef, useMemo } from 'react';
import { useSpreadsheet } from '../context/useSpreadsheet';
import {
  addressToCellKey,
  cellKeyToAddress,
  getNormalizedRange,
} from '../utils/coordinates';
import { Check, X, FunctionSquare } from 'lucide-react';

export const FormulaBar: React.FC = () => {
  const {
    cells,
    selectedCell,
    selectedRange,
    editingCell,
    editValue,
    selectCell,
    startEditing,
    updateEditValue,
    commitEdit,
    cancelEdit,
  } = useSpreadsheet();

  const inputRef = useRef<HTMLInputElement>(null);
  const activeKey = addressToCellKey(selectedCell);
  const activeCell = cells[activeKey];

  const currentAddress = useMemo(() => {
    if (selectedRange) {
      const bounds = getNormalizedRange(selectedRange);
      const startKey = addressToCellKey({ col: bounds.startCol, row: bounds.startRow });
      const endKey = addressToCellKey({ col: bounds.endCol, row: bounds.endRow });
      return `${startKey}:${endKey}`;
    }
    return activeKey;
  }, [selectedRange, activeKey]);

  const [customAddress, setCustomAddress] = useState<string | null>(null);
  const addressDisplay = customAddress !== null ? customAddress : currentAddress;

  // Handle address box jump
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddress) {
      const addr = cellKeyToAddress(customAddress);
      if (addr) {
        selectCell(addr);
      }
    }
    setCustomAddress(null);
  };

  // Determine current value to show in formula input
  const isCurrentlyEditing = editingCell !== null;
  const displayFormulaValue = isCurrentlyEditing
    ? editValue
    : activeCell?.raw !== undefined
    ? activeCell.raw
    : '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCurrentlyEditing) {
      startEditing(selectedCell, e.target.value);
    } else {
      updateEditValue(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit('down');
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="formula-bar-container" role="region" aria-label="Formula Bar">
      {/* Active Cell Reference Input */}
      <form onSubmit={handleAddressSubmit} className="name-box-form">
        <input
          type="text"
          className="name-box-input"
          value={addressDisplay}
          onChange={(e) => setCustomAddress(e.target.value.toUpperCase())}
          onBlur={handleAddressSubmit}
          aria-label="Active Cell Address"
          title="Type cell address (e.g. B5) and press Enter to jump"
        />
      </form>

      {/* Formula action buttons */}
      <div className="formula-actions">
        {isCurrentlyEditing ? (
          <>
            <button
              type="button"
              className="formula-btn cancel-btn"
              onClick={cancelEdit}
              title="Cancel (Esc)"
              aria-label="Cancel formula edit"
            >
              <X size={15} />
            </button>
            <button
              type="button"
              className="formula-btn commit-btn"
              onClick={() => commitEdit('none')}
              title="Commit (Enter)"
              aria-label="Commit formula edit"
            >
              <Check size={15} />
            </button>
          </>
        ) : (
          <div className="fx-indicator" title="Formula">
            <FunctionSquare size={16} />
            <span className="fx-symbol">fx</span>
          </div>
        )}
      </div>

      {/* Formula Text Field */}
      <div className="formula-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="formula-input"
          placeholder="Enter a value or formula (e.g. =SUM(A1:B5) or =A1*2)"
          value={displayFormulaValue}
          onFocus={() => {
            if (!isCurrentlyEditing) {
              startEditing(selectedCell, activeCell?.raw || '');
            }
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Formula input bar"
        />
      </div>
    </div>
  );
};
