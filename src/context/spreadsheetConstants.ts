import type { CellMap } from '../types/spreadsheet';

export const STORAGE_KEY = 'mini_spreadsheet_data_v1';
export const DEFAULT_ROW_COUNT = 1000;
export const DEFAULT_COL_COUNT = 26;
export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 28;

export const STARTER_DEMO_CELLS: CellMap = {
  // Header
  A1: { raw: 'Quarterly Sales & Expenses Report', value: 'Quarterly Sales & Expenses Report', display: 'Quarterly Sales & Expenses Report', format: { bold: true, align: 'left', textColor: '#1e40af' } },

  // Table headers
  A3: { raw: 'Category', value: 'Category', display: 'Category', format: { bold: true, backgroundColor: '#f1f5f9' } },
  B3: { raw: 'Q1', value: 'Q1', display: 'Q1', format: { bold: true, align: 'right', backgroundColor: '#f1f5f9' } },
  C3: { raw: 'Q2', value: 'Q2', display: 'Q2', format: { bold: true, align: 'right', backgroundColor: '#f1f5f9' } },
  D3: { raw: 'Q3', value: 'Q3', display: 'Q3', format: { bold: true, align: 'right', backgroundColor: '#f1f5f9' } },
  E3: { raw: 'Q4', value: 'Q4', display: 'Q4', format: { bold: true, align: 'right', backgroundColor: '#f1f5f9' } },
  F3: { raw: 'Annual Total', value: 'Annual Total', display: 'Annual Total', format: { bold: true, align: 'right', backgroundColor: '#e2e8f0' } },

  // Rows
  A4: { raw: 'Product Revenue', value: 'Product Revenue', display: 'Product Revenue' },
  B4: { raw: '12500', value: 12500, display: '12500', format: { align: 'right' } },
  C4: { raw: '14200', value: 14200, display: '14200', format: { align: 'right' } },
  D4: { raw: '16800', value: 16800, display: '16800', format: { align: 'right' } },
  E4: { raw: '19500', value: 19500, display: '19500', format: { align: 'right' } },
  F4: { raw: '=SUM(B4:E4)', value: null, display: '', format: { bold: true, align: 'right' } },

  A5: { raw: 'Service Revenue', value: 'Service Revenue', display: 'Service Revenue' },
  B5: { raw: '4200', value: 4200, display: '4200', format: { align: 'right' } },
  C5: { raw: '4800', value: 4800, display: '4800', format: { align: 'right' } },
  D5: { raw: '5300', value: 5300, display: '5300', format: { align: 'right' } },
  E5: { raw: '6100', value: 6100, display: '6100', format: { align: 'right' } },
  F5: { raw: '=SUM(B5:E5)', value: null, display: '', format: { bold: true, align: 'right' } },

  A6: { raw: 'Total Revenue', value: 'Total Revenue', display: 'Total Revenue', format: { bold: true, backgroundColor: '#eff6ff' } },
  B6: { raw: '=B4+B5', value: null, display: '', format: { bold: true, align: 'right', backgroundColor: '#eff6ff' } },
  C6: { raw: '=C4+C5', value: null, display: '', format: { bold: true, align: 'right', backgroundColor: '#eff6ff' } },
  D6: { raw: '=D4+D5', value: null, display: '', format: { bold: true, align: 'right', backgroundColor: '#eff6ff' } },
  E6: { raw: '=E4+E5', value: null, display: '', format: { bold: true, align: 'right', backgroundColor: '#eff6ff' } },
  F6: { raw: '=SUM(F4:F5)', value: null, display: '', format: { bold: true, align: 'right', backgroundColor: '#dbeafe' } },

  // Statistics Section
  A8: { raw: 'Quarterly Statistics', value: 'Quarterly Statistics', display: 'Quarterly Statistics', format: { bold: true, textColor: '#475569' } },
  A9: { raw: 'Average per Quarter', value: 'Average per Quarter', display: 'Average per Quarter' },
  B9: { raw: '=AVERAGE(B6:E6)', value: null, display: '', format: { align: 'right', bold: true } },

  A10: { raw: 'Best Quarter (Max)', value: 'Best Quarter (Max)', display: 'Best Quarter (Max)' },
  B10: { raw: '=MAX(B6:E6)', value: null, display: '', format: { align: 'right' } },

  A11: { raw: 'Lowest Quarter (Min)', value: 'Lowest Quarter (Min)', display: 'Lowest Quarter (Min)' },
  B11: { raw: '=MIN(B6:E6)', value: null, display: '', format: { align: 'right' } },
};
