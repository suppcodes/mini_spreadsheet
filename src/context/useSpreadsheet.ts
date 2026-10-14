import { useContext } from 'react';
import { SpreadsheetContext } from './SpreadsheetContextType';

export function useSpreadsheet() {
  const ctx = useContext(SpreadsheetContext);
  if (!ctx) {
    throw new Error('useSpreadsheet must be used within a SpreadsheetProvider');
  }
  return ctx;
}
