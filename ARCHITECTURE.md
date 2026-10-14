# Architecture & Design Decisions

This document outlines the architectural blueprint, state management design, formula calculation engine, dependency resolution strategy, and virtualization mechanics implemented in **Mini Spreadsheet**.

---

## 1. High-Level System Architecture

The application adopts a modular, decoupled architecture adhering to the Single Responsibility Principle:

```
┌─────────────────────────────────────────────────────────────┐
│                       User Interface                        │
│  [Toolbar]  [FormulaBar]  [VirtualGrid]  [StatusBar] [Modal]│
└──────────────────────────────▲──────────────────────────────┘
                               │ React Context Hook
┌──────────────────────────────┴──────────────────────────────┐
│                    SpreadsheetProvider                      │
│   • Cell Map (raw, computed, display, formatting)           │
│   • Selection (active cell, rectangular ranges)             │
│   • Inline Editor State (active edit, draft value)          │
│   • History Stacks (Undo/Redo with max-size ring)           │
│   • Persistence Controller (debounced localStorage)         │
└──────────────────────────────▲──────────────────────────────┘
                               │ Recalculate
┌──────────────────────────────┴──────────────────────────────┐
│               Dependency & Calculation Engine               │
│   1. Lexical Tokenizer (formula scanner)                    │
│   2. Recursive-Descent AST Parser (grammar & precedence)    │
│   3. 3-Color DFS Cycle Detector (circular reference guard)   │
│   4. Kahn's Algorithm Topological Sorter (evaluation order) │
│   5. AST Evaluator (safe math, statistics, errors)          │
│   6. Relative Formula Reference Translator (fill handle)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. State Model

The state is managed centrally via `SpreadsheetProvider` using standard React hooks (`useState`, `useCallback`, `useMemo`, `useRef`):

### Cell Data Model
```typescript
export interface CellFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface CellData {
  raw: string;                             // User entry: e.g. "=SUM(A1:B4)" or "42"
  value: string | number | boolean | null; // Computed evaluation result
  display: string;                         // Formatted representation
  error?: string | null;                   // Error tag: "#ERROR!", "#REF!", "#DIV/0!", "#CIRCULAR!"
  format?: CellFormatting;
}

export type CellMap = Record<string, CellData>; // Keyed by cell coordinate (e.g. "A1", "C12")
```

### Undo / Redo History Stack
State changes (editing, clearing, formatting, fill handle) create an immutable snapshot stored in an `undoStack` (capped at 50 snapshots to prevent memory bloat).
- **Undo**: Pops the latest snapshot from `undoStack`, pushes the current state to `redoStack`, and restores the snapshot.
- **Redo**: Pops from `redoStack`, pushes to `undoStack`, and restores the state.
- New edits clear the `redoStack`.

---

## 3. Formula Evaluation Engine

### Step 1: Lexical Tokenization (`tokenizer.ts`)
Formulas starting with `=` are tokenized character-by-character into distinct tokens:
- `NUMBER` (e.g. `10`, `3.1415`)
- `STRING` (e.g. `"Q1 Report"`)
- `CELL_REF` (e.g. `A1`, `BC99`)
- `RANGE_REF` (e.g. `A1:B10`)
- `IDENTIFIER` (e.g. `SUM`, `AVERAGE`, `MIN`, `MAX`, `IF`, `COUNT`)
- `OPERATOR` (`+`, `-`, `*`, `/`, `^`, `&`, `=`, `<>`, `<`, `>`, `<=`, `>=`)
- `LPAREN`, `RPAREN`, `COMMA`

### Step 2: Recursive-Descent AST Parser (`parser.ts`)
The parser converts token streams into a strongly-typed Abstract Syntax Tree (AST), enforcing correct operator precedence:
1. Comparisons: `=`, `<>`, `<`, `>`, `<=`, `>=`
2. Concatenation: `&`
3. Additive: `+`, `-`
4. Multiplicative: `*`, `/`
5. Exponential: `^` (right-associative)
6. Unary: `-`, `+`
7. Primary: Numbers, Strings, Booleans, Cell Refs, Range Refs, Function Calls, Parenthesized Expressions

### Step 3: AST Evaluator (`evaluator.ts`)
The evaluator walks the AST recursively and evaluates expressions safely:
- **No unsafe execution**: Zero use of `eval()` or `new Function()`.
- **Range Unpacking**: Statistical functions (`SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`) unpack ranges into individual cell lookups, ignoring blank and text cells in accordance with Google Sheets / Excel specifications.
- **Error Propagation**: Errors like `#DIV/0!`, `#REF!`, `#VALUE!`, `#NAME?` propagate up the expression tree.

---

## 4. Dependency Graph & Recalculation Strategy

Spreadsheet recalculation is powered by `DependencyGraph` (`src/formula/dependency.ts`):

### 1. Directed Acyclic Graph (DAG)
The engine maintains two maps:
- `precedents`: `Map<cellKey, Set<referencedCellKeys>>` (what this cell depends on)
- `dependents`: `Map<cellKey, Set<downstreamCellKeys>>` (what depends on this cell)

### 2. Cycle Detection (3-Color DFS)
Before evaluating formulas, the graph is analyzed for circular dependencies using Depth-First Search with 3 states:
- **0 (White)**: Unvisited
- **1 (Gray)**: Currently visiting (active in call stack)
- **2 (Black)**: Visited and verified clean

If a node in state 1 is revisited, a cycle is detected! Every cell participating in the cycle is isolated and assigned `#CIRCULAR!`. This completely prevents infinite evaluation loops or stack overflows.

### 3. Topological Sorting (Kahn's Algorithm)
For non-cyclic cells, an in-degree map is constructed representing prerequisite dependencies among the target cells:
1. Cells with in-degree 0 (no prerequisites) are enqueued.
2. Cells are processed in order, decrementing dependent neighbor in-degrees.
3. Newly freed cells (in-degree 0) are added to the evaluation queue.

### 4. Reactive Incremental Recalculation
When a user updates cell `X`:
1. `getTransitiveDependents([X])` collects only `X` and its downstream dependencies.
2. Only that affected subgraph is sorted and re-evaluated, leaving unrelated cells untouched. This achieves $O(V_{affected} + E_{affected})$ performance.

---

## 5. Virtual Grid Architecture

Rendering 1,000 rows × 26 columns without virtualization would generate 26,000+ DOM nodes, causing severe lag and high memory consumption.

`VirtualGrid` (`src/components/Grid/VirtualGrid.tsx`) solves this via windowed virtualization:

1. **Offset Pre-computation**: Column widths and row heights are accumulated into position arrays:
   - `colPositions[c]`: Cumulative left offset for column $c$.
   - `rowPositions[r]`: Cumulative top offset for row $r$.
2. **Binary/Linear Window Search**: Based on `scrollTop`, `scrollLeft`, `viewportWidth`, and `viewportHeight`, the grid computes the exact visible row window `[startRow, endRow]` and column window `[startCol, endCol]`.
3. **Overscan Buffering**: An overscan margin of 6 rows and columns is maintained around the viewport to guarantee seamless scrolling without visual flickering.
4. **Absolute Chunk Positioning**: Visible rows and cells are positioned using CSS `transform: translateY(...)` and `translateX(...)`, achieving 60 FPS hardware-accelerated rendering.
5. **Sticky Headers**: Sticky column headers (z-index: 10) and row headers (z-index: 10) remain visible during scrolling with interactive resize handles.

---

## 6. Smart Formula Translation (Fill Handle & Copy/Paste)

When dragging the fill handle or copying a formula:
- Cell references (e.g. `A1`) are translated by row offset and column offset:
  $\text{newRow} = \text{origRow} + \Delta\text{row}, \quad \text{newCol} = \text{origCol} + \Delta\text{col}$.
- Range references (e.g. `A1:B5`) translate both corner references:
  `A1:B5` shifted 1 row down becomes `A2:B6`.

---

## 7. Data Persistence

Spreadsheet data, column widths, row heights, and timestamps are automatically saved to browser `localStorage` under the key `mini_spreadsheet_data_v1` using a 600ms debounce timer. On page refresh, the application restores the state and re-verifies dependencies.
