import type { CellMap, CellRange } from '../types/spreadsheet';
import { addressToCellKey, getNormalizedRange } from './coordinates';

/**
 * Escapes a cell value for CSV output according to RFC 4180.
 */
export function escapeCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Exports cells to a CSV string. Can export the whole active table or a specified range.
 */
export function exportToCsv(
  cells: CellMap,
  exportFormulas = false,
  range?: CellRange
): string {
  let startCol = 0;
  let endCol = 25;
  let startRow = 0;
  let endRow = 49;

  if (range) {
    const bounds = getNormalizedRange(range);
    startCol = bounds.startCol;
    endCol = bounds.endCol;
    startRow = bounds.startRow;
    endRow = bounds.endRow;
  } else {
    // Find maximal populated col and row to avoid exporting thousands of empty trailing rows
    let maxFoundCol = 0;
    let maxFoundRow = 0;
    let hasAnyData = false;

    for (const [key, cell] of Object.entries(cells)) {
      if (cell && (cell.raw || cell.display)) {
        hasAnyData = true;
        const match = key.match(/^([A-Z]+)([1-9][0-9]*)$/);
        if (match) {
          let col = 0;
          for (let i = 0; i < match[1].length; i++) {
            col = col * 26 + (match[1].charCodeAt(i) - 64);
          }
          const c = col - 1;
          const r = parseInt(match[2], 10) - 1;
          if (c > maxFoundCol) maxFoundCol = c;
          if (r > maxFoundRow) maxFoundRow = r;
        }
      }
    }

    if (hasAnyData) {
      endCol = Math.max(9, maxFoundCol);
      endRow = Math.max(19, maxFoundRow);
    } else {
      endCol = 9;
      endRow = 19;
    }
  }

  const rows: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const rowFields: string[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const key = addressToCellKey({ col: c, row: r });
      const cell = cells[key];
      const val = cell
        ? (exportFormulas && cell.raw ? cell.raw : cell.display || '')
        : '';
      rowFields.push(escapeCsvField(val));
    }
    rows.push(rowFields.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Parses CSV text into a 2D array of string values, correctly adhering to RFC 4180 rules.
 */
export function parseCsv(csvText: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];
    const nextCh = csvText[i + 1];

    if (insideQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        insideQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (ch === '\r') {
        if (nextCh === '\n') {
          i++;
        }
        currentRow.push(currentField);
        result.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentField);
        result.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Push last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}

/**
 * Downloads a string content as a file in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
