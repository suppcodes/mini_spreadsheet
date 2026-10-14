# Mini Spreadsheet Application

A powerful, high-performance, browser-based spreadsheet application inspired by Google Sheets. Built with **React**, **TypeScript**, and **Vite**, featuring virtualized grid rendering (handling 1,000+ rows smoothly), a safe recursive-descent formula parser and AST evaluator, automatic dependency tracking, cycle detection, undo/redo history, drag-to-fill with formula reference translation, and CSV import/export.

![Mini Spreadsheet Screenshot](https://raw.githubusercontent.com/suppcodes/mini_spreadsheet/main/public/preview.png)

---

## 🌟 Live Demo & Repository

- **GitHub Repository**: [https://github.com/suppcodes/mini_spreadsheet.git](https://github.com/suppcodes/mini_spreadsheet.git)
- **Live Deployment**: Deployed on Vercel

---

## 🚀 Key Features

### 1. Spreadsheet Grid & Virtualization
- **High-Performance Virtual Grid**: Smoothly renders large grids (1,000 rows × 26 columns) using dynamic windowing, rendering only visible cells and buffer in the DOM.
- **Sticky Headers**: Fixed row numbers (1, 2, 3...) and column labels (A, B, C... Z) that stay in place during scrolling.
- **Resizing**: Interactive mouse drag resizing for column widths and row heights.
- **Multi-Cell Range Selection**: Click and drag across cells or use `Shift + Arrow` keys to select rectangular bounding boxes.
- **Active Range Statistics**: Automatically computes and displays live `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX` in the status bar for any multi-cell selection.

### 2. Robust Formula Engine & Safety
- **Safe Evaluation (Zero `eval()` / `new Function()`):** Lexical tokenizer and recursive-descent AST parser that safely interprets mathematical and functional expressions.
- **Arithmetic Operators**: `+`, `-`, `*`, `/`, `^` (exponents), unary `-` and `+`, and parentheses with standard operator precedence.
- **String & Comparison Operators**: Concatenation `&`, and comparisons `=`, `<>`, `<`, `>`, `<=`, `>=`.
- **Functions Supported**:
  - `SUM(range | values...)` — Sums numeric values, safely skipping text in ranges.
  - `AVERAGE(range | values...)` — Computes arithmetic mean, returns `#DIV/0!` if no numbers.
  - `MIN(range | values...)` — Finds minimum value in range or argument list.
  - `MAX(range | values...)` — Finds maximum value in range or argument list.
  - `COUNT(range | values...)` — Counts numeric cells.
  - `COUNTA(range | values...)` — Counts non-empty cells.
  - `IF(condition, true_value, false_value)` — Conditional logic branching.
  - `CONCAT(str1, str2, ...)` — Concatenates multiple strings.
  - `ABS(number)` — Returns absolute value.
  - `ROUND(number, [decimals])` — Rounds to given precision.
- **Standard Error Types**: Clear diagnostic error reporting:
  - `#DIV/0!` — Division by zero.
  - `#REF!` — Invalid cell reference.
  - `#VALUE!` — Type mismatch (e.g. text multiplied by number).
  - `#NAME?` — Unrecognized function identifier.
  - `#CIRCULAR!` — Detected circular dependency loop.
  - `#ERROR!` — General formula parse or syntax error.

### 3. Dependency Graph & Automatic Recalculation
- **Directed Acyclic Graph (DAG)**: Tracks precedent cells (cells depended upon) and dependent cells (cells that depend on this cell).
- **Cycle Detection**: 3-state DFS cycle detection catches direct self-references (e.g., `A1 = A1 + 1`) and transitive multi-hop loops (e.g., `A1 -> B1 -> C1 -> A1`), immediately marking offending cells `#CIRCULAR!` without freezing or crashing the browser.
- **Topological Sorting**: Evaluates dependent cells in topological order using Kahn's algorithm so every value is guaranteed fresh before downstream evaluation.
- **Interactive Dependency Inspector**: Built-in modal dialog to view the dependency graph, inspect precedents/dependents for every formula cell, search formulas, and view the calculation pipeline.

### 4. Smart Fill Handle & Clipboard Operations
- **Fill Handle (Drag-to-Copy)**: Drag the blue corner square of any cell or selection box down or across.
- **Relative Formula Translation**: Automatically offsets cell references (e.g. `=A1+B1` dragged down 1 row becomes `=A2+B2`).
- **Clipboard Integration**:
  - `Ctrl+C` / Copy button: Copies formatted TSV to system clipboard.
  - `Ctrl+X` / Cut button: Copies and clears selected cells.
  - `Ctrl+V` / Paste button: Pastes tabular data from clipboard or internal clipboard with formula translation.

### 5. Editing, Formatting & History
- **Undo / Redo Stack**: Multi-level undo/redo (`Ctrl+Z` and `Ctrl+Y` / `Ctrl+Shift+Z`) for cell edits, formatting changes, paste, and clear.
- **Cell Formatting**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Text Color, Background Fill Color, Text Alignment (Left, Center, Right).
- **Formula Bar**: Synchronized formula bar showing cell coordinates, fx indicator, jump-to-cell box, and commit/cancel buttons.

### 6. Persistence & CSV
- **Auto-Save**: Debounced automatic persistence to browser `localStorage`.
- **CSV Export**: Export the entire sheet or currently selected range to RFC 4180 compliant CSV.
- **CSV Import**: Import existing CSV files with quote and newline support.
- **Starter Demo**: Includes pre-populated Sales & Budget demo report showing formulas, styling, and statistics.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Arrow Keys` | Move selected cell |
| `Shift + Arrow Keys` | Expand / contract range selection |
| `Enter` | Commit edit and move to cell below |
| `Shift + Enter` | Commit edit and move to cell above |
| `Tab` | Commit edit and move to cell to the right |
| `Shift + Tab` | Commit edit and move to cell to the left |
| `F2` or `Double-Click` | Enter inline edit mode |
| `Escape` | Cancel inline edit mode |
| `Delete` / `Backspace` | Clear cell contents |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo action |
| `Ctrl + C` | Copy active cell or range |
| `Ctrl + X` | Cut active cell or range |
| `Ctrl + V` | Paste copied cells |
| `Ctrl + A` | Select entire spreadsheet |
| `Ctrl + B` | Toggle Bold |
| `Ctrl + I` | Toggle Italic |
| `Ctrl + U` | Toggle Underline |

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 8
- **Testing**: Vitest + JSDOM + `@testing-library/react` + `@testing-library/jest-dom`
- **Linting**: Oxlint (0 warnings, 0 errors)
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## 💻 Setup & Installation

### Prerequisites
- Node.js (v18 or higher; tested on Node.js v24)
- npm (v9 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/suppcodes/mini_spreadsheet.git
cd mini_spreadsheet

# Install dependencies
npm install
```

### Running the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Running Automated Tests
```bash
npm test
```
Runs 56 automated unit, integration, and E2E tests across 7 test suites using Vitest.

### Linting
```bash
npm run lint
```
Checks code quality with Oxlint (verified 0 warnings, 0 errors).

### Production Build
```bash
npm run build
```
Typechecks the project (`tsc -b`) and generates production assets in `/dist`.

### Preview Production Build
```bash
npm run preview
```

---

## 📁 Project Architecture

```
mini_spreadsheet/
├── src/
│   ├── components/
│   │   ├── Grid/
│   │   │   ├── Cell.tsx               # Individual cell renderer and inline editor
│   │   │   └── VirtualGrid.tsx        # High-performance virtualized grid
│   │   ├── DependencyViewerModal.tsx  # Interactive DAG inspector & cycle alert modal
│   │   ├── FormulaBar.tsx             # Formula bar with name box & action buttons
│   │   ├── Spreadsheet.tsx            # Main layout container
│   │   ├── StatusBar.tsx              # Bottom status bar with live range stats
│   │   └── Toolbar.tsx                # Action toolbar with formatting, CSV, undo/redo
│   ├── context/
│   │   ├── spreadsheetConstants.ts    # Dimensions, storage keys, starter demo data
│   │   ├── SpreadsheetContext.tsx     # Central spreadsheet provider
│   │   ├── SpreadsheetContextType.ts  # Context interface and React context object
│   │   └── useSpreadsheet.ts          # Custom hook for consuming spreadsheet state
│   ├── formula/
│   │   ├── dependency.ts              # DAG engine, cycle detection, topological sort
│   │   ├── evaluator.ts               # AST evaluator, functions, error propagation
│   │   ├── formulaTranslator.ts       # Relative reference translation for fill handle
│   │   ├── parser.ts                  # Recursive-descent AST parser
│   │   ├── tokenizer.ts               # Lexical scanner for formula expressions
│   │   └── types.ts                   # AST node and token interfaces
│   ├── test/
│   │   ├── coordinates.test.ts        # Unit tests for coordinates & ranges
│   │   ├── csv.test.ts                # Unit tests for CSV parser & exporter
│   │   ├── dependency.test.ts         # Unit tests for DAG, cycles, topological sort
│   │   ├── formula.test.ts            # Unit tests for formula parser & functions
│   │   ├── formulaTranslator.test.ts  # Unit tests for fill handle formula translation
│   │   ├── setup.ts                   # Vitest test environment setup
│   │   ├── SpreadsheetContext.test.tsx# Integration tests for state & interactions
│   │   └── recruiterE2E.test.tsx      # Comprehensive recruiter E2E flow tests
│   ├── types/
│   │   └── spreadsheet.ts             # Core spreadsheet types and interfaces
│   ├── utils/
│   │   ├── coordinates.ts             # Excel coordinate helpers (A1 <-> {col, row})
│   │   └── csv.ts                     # RFC 4180 compliant CSV import & export
│   ├── App.css                        # Application styles and virtual grid styling
│   ├── App.tsx                        # Root application component
│   ├── index.css                      # Base CSS reset and color variables
│   └── main.tsx                       # React application entry point
├── ARCHITECTURE.md                    # Deep dive into system architecture & algorithms
├── PROJECT_NOTES.md                   # Development notes, edge cases, and test results
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔍 Known Limitations & Future Enhancements

1. **Cell Range Formatting**: Formatting currently applies cell-by-cell; conditional formatting rules (e.g. highlight if value > 100) can be added as a future feature.
2. **Formula Autocomplete**: An inline dropdown for function names while typing in the cell can enhance user convenience.
3. **Multi-Sheet Tabs**: Currently supports a single active sheet (up to 1,000 rows × 26 columns); tabbed multi-sheet workbooks can be built atop the existing architecture.
