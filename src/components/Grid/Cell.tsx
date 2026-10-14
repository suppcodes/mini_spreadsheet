import React, { useRef, useEffect } from 'react';
import type { CellData } from '../../types/spreadsheet';

interface CellProps {
  col: number;
  row: number;
  cellKey: string;
  data?: CellData;
  width: number;
  height: number;
  isSelected: boolean;
  isInRange: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onEditChange: (val: string) => void;
  onEditCommit: (direction?: 'none' | 'down' | 'up' | 'right' | 'left') => void;
  onEditCancel: () => void;
}

export const Cell: React.FC<CellProps> = ({
  cellKey,
  data,
  width,
  height,
  isSelected,
  isInRange,
  isEditing,
  editValue,
  onSelect,
  onDoubleClick,
  onEditChange,
  onEditCommit,
  onEditCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const format = data?.format || {};
  const isError = Boolean(data?.error);

  const style: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    fontWeight: format.bold ? '600' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal',
    textDecoration: format.underline ? 'underline' : 'none',
    color: isError ? '#dc2626' : format.textColor || '#0f172a',
    backgroundColor: format.backgroundColor || '#ffffff',
    textAlign: format.align || 'left',
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditCommit(e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onEditCommit(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel();
    }
  };

  let classNames = 'grid-cell';
  if (isSelected) classNames += ' cell-selected';
  if (isInRange) classNames += ' cell-in-range';
  if (isError) classNames += ' cell-has-error';

  return (
    <div
      className={classNames}
      style={style}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      data-cell={cellKey}
      role="gridcell"
      aria-selected={isSelected}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="cell-editor-input"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onEditCommit('none')}
          aria-label={`Editing cell ${cellKey}`}
        />
      ) : (
        <span className="cell-content-text" title={isError ? `${data?.error}: ${data?.raw}` : data?.raw}>
          {data ? data.display : ''}
        </span>
      )}
    </div>
  );
};
