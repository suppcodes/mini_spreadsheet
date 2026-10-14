import type { ASTNode } from './types';
import { FormulaParser } from './parser';
import { FormulaEvaluator } from './evaluator';
import { parseCellRange, getCellsInRange } from '../utils/coordinates';
import type { CellMap, DependencyNodeInfo } from '../types/spreadsheet';

export class DependencyGraph {
  // cellKey -> set of cellKeys that this cell depends ON (precedents)
  private precedents = new Map<string, Set<string>>();

  // cellKey -> set of cellKeys that depend ON this cell (dependents)
  private dependents = new Map<string, Set<string>>();

  private parser = new FormulaParser();

  /**
   * Clears the graph.
   */
  clear(): void {
    this.precedents.clear();
    this.dependents.clear();
  }

  /**
   * Extracts all referenced cell keys from an AST node (including expanded ranges).
   */
  static extractReferences(node: ASTNode): Set<string> {
    const refs = new Set<string>();

    function traverse(n: ASTNode) {
      if (n.type === 'CellRef') {
        refs.add(n.ref);
      } else if (n.type === 'RangeRef') {
        const range = parseCellRange(n.raw);
        if (range) {
          const cells = getCellsInRange(range);
          for (const c of cells) {
            refs.add(c);
          }
        }
      } else if (n.type === 'UnaryOp') {
        traverse(n.argument);
      } else if (n.type === 'BinaryOp') {
        traverse(n.left);
        traverse(n.right);
      } else if (n.type === 'FunctionCall') {
        for (const arg of n.args) {
          traverse(arg);
        }
      }
    }

    traverse(node);
    return refs;
  }

  /**
   * Updates dependencies for a cellKey based on its formula raw string.
   */
  updateCellDependencies(cellKey: string, raw: string): Set<string> {
    // Remove old precedents for this cell from the dependents map
    const oldPrecedents = this.precedents.get(cellKey);
    if (oldPrecedents) {
      for (const p of oldPrecedents) {
        this.dependents.get(p)?.delete(cellKey);
      }
    }

    if (!raw.trim().startsWith('=')) {
      this.precedents.delete(cellKey);
      return new Set();
    }

    try {
      const ast = this.parser.parse(raw);
      const refs = DependencyGraph.extractReferences(ast);
      this.precedents.set(cellKey, refs);

      // Register this cell as a dependent for each referenced precedent
      for (const ref of refs) {
        if (!this.dependents.has(ref)) {
          this.dependents.set(ref, new Set());
        }
        this.dependents.get(ref)!.add(cellKey);
      }

      return refs;
    } catch {
      this.precedents.delete(cellKey);
      return new Set();
    }
  }

  /**
   * Detects if there is any cycle involving `startKey` or reachable from it.
   * Returns an array of cell keys involved in cycles.
   */
  detectCycles(): Set<string> {
    const cycleCells = new Set<string>();
    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting (in stack), 2: visited

    const dfs = (node: string, path: string[]) => {
      visited.set(node, 1);
      path.push(node);

      const precs = this.precedents.get(node);
      if (precs) {
        for (const p of precs) {
          const state = visited.get(p) ?? 0;
          if (state === 1) {
            // Cycle detected! Every node from p to the end of path is in the cycle
            const cycleStartIndex = path.indexOf(p);
            if (cycleStartIndex !== -1) {
              for (let i = cycleStartIndex; i < path.length; i++) {
                cycleCells.add(path[i]);
              }
            } else {
              cycleCells.add(p);
              cycleCells.add(node);
            }
          } else if (state === 0) {
            dfs(p, path);
          }
        }
      }

      path.pop();
      visited.set(node, 2);
    };

    for (const node of this.precedents.keys()) {
      if ((visited.get(node) ?? 0) === 0) {
        dfs(node, []);
      }
    }

    return cycleCells;
  }

  /**
   * Gets all downstream cells that depend directly or indirectly on the changed cells.
   */
  getTransitiveDependents(changedKeys: string[]): Set<string> {
    const result = new Set<string>();
    const queue = [...changedKeys];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const deps = this.dependents.get(current);
      if (deps) {
        for (const dep of deps) {
          if (!result.has(dep)) {
            result.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    return result;
  }

  /**
   * Topologically sorts a set of cell keys to determine evaluation order.
   * Returns null if a circular dependency is detected among the keys.
   */
  topologicalSort(keysToSort: Set<string>): { sorted: string[]; hasCycle: boolean } {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, Set<string>>();

    for (const key of keysToSort) {
      inDegree.set(key, 0);
      adj.set(key, new Set());
    }

    // Populate in-degree: a key's in-degree is how many other keys in keysToSort it depends on
    for (const key of keysToSort) {
      const precs = this.precedents.get(key);
      if (precs) {
        for (const p of precs) {
          if (keysToSort.has(p)) {
            inDegree.set(key, (inDegree.get(key) || 0) + 1);
            if (!adj.has(p)) adj.set(p, new Set());
            adj.get(p)!.add(key);
          }
        }
      }
    }

    const queue: string[] = [];
    for (const [key, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(key);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sorted.push(u);

      const neighbors = adj.get(u);
      if (neighbors) {
        for (const v of neighbors) {
          const currentDeg = inDegree.get(v)! - 1;
          inDegree.set(v, currentDeg);
          if (currentDeg === 0) {
            queue.push(v);
          }
        }
      }
    }

    const hasCycle = sorted.length < keysToSort.size;
    return { sorted, hasCycle };
  }

  /**
   * Full recalculation of the spreadsheet cells.
   * Recalculates changed cells and their downstream dependents in topological order.
   */
  recalculateSpreadsheet(
    cells: CellMap,
    affectedKeys?: string[]
  ): CellMap {
    const updatedCells: CellMap = { ...cells };

    // 1. Update dependency graph for all cells or affected cells
    const allCellKeys = Object.keys(updatedCells);
    for (const k of allCellKeys) {
      const cell = updatedCells[k];
      if (cell && cell.raw) {
        this.updateCellDependencies(k, cell.raw);
      }
    }

    // 2. Detect any circular reference cycles in the whole sheet
    const cycleCells = this.detectCycles();

    // 3. Determine which cells need evaluation
    let targetKeys: Set<string>;
    if (affectedKeys && affectedKeys.length > 0) {
      const dependents = this.getTransitiveDependents(affectedKeys);
      targetKeys = new Set([...affectedKeys, ...dependents]);
    } else {
      targetKeys = new Set(allCellKeys);
    }

    // 4. Mark circular cells with #CIRCULAR!
    for (const c of cycleCells) {
      if (updatedCells[c]) {
        updatedCells[c] = {
          ...updatedCells[c],
          value: null,
          display: '#CIRCULAR!',
          error: '#CIRCULAR!',
        };
      }
    }

    // Filter out cycle cells from topological evaluation
    const nonCycleTargets = new Set<string>();
    for (const k of targetKeys) {
      if (!cycleCells.has(k)) {
        nonCycleTargets.add(k);
      }
    }

    // 5. Sort topologically
    const { sorted } = this.topologicalSort(nonCycleTargets);

    // 6. Evaluator helper function
    const getCellValue = (cellKey: string) => {
      const cell = updatedCells[cellKey];
      if (!cell) {
        return { value: null };
      }
      return { value: cell.value, error: cell.error };
    };

    const evaluator = new FormulaEvaluator(getCellValue);

    // 7. Evaluate sorted cells
    for (const key of sorted) {
      const cell = updatedCells[key];
      if (!cell) continue;

      const raw = cell.raw.trim();

      if (!raw.startsWith('=')) {
        // Plain literal value
        if (raw === '') {
          updatedCells[key] = {
            ...cell,
            value: null,
            display: '',
            error: null,
          };
        } else if (!isNaN(Number(raw)) && !isNaN(parseFloat(raw))) {
          const num = Number(raw);
          updatedCells[key] = {
            ...cell,
            value: num,
            display: raw,
            error: null,
          };
        } else if (raw.toUpperCase() === 'TRUE' || raw.toUpperCase() === 'FALSE') {
          const b = raw.toUpperCase() === 'TRUE';
          updatedCells[key] = {
            ...cell,
            value: b,
            display: b ? 'TRUE' : 'FALSE',
            error: null,
          };
        } else {
          updatedCells[key] = {
            ...cell,
            value: cell.raw,
            display: cell.raw,
            error: null,
          };
        }
      } else {
        // It's a formula!
        try {
          const ast = this.parser.parse(raw);
          const result = evaluator.evaluate(ast);

          if (result.error) {
            updatedCells[key] = {
              ...cell,
              value: null,
              display: result.error,
              error: result.error,
            };
          } else {
            let displayStr = '';
            if (result.value === null || result.value === undefined) {
              displayStr = '';
            } else if (typeof result.value === 'number') {
              // Format cleanly: avoid float precision artifacts like 0.30000000000000004
              displayStr = Number.isInteger(result.value)
                ? result.value.toString()
                : parseFloat(result.value.toFixed(8)).toString();
            } else if (typeof result.value === 'boolean') {
              displayStr = result.value ? 'TRUE' : 'FALSE';
            } else {
              displayStr = String(result.value);
            }

            updatedCells[key] = {
              ...cell,
              value: result.value,
              display: displayStr,
              error: null,
            };
          }
        } catch (err: any) {
          const errorMsg = err.message && err.message.startsWith('#') ? err.message : '#ERROR!';
          updatedCells[key] = {
            ...cell,
            value: null,
            display: errorMsg,
            error: errorMsg,
          };
        }
      }
    }

    return updatedCells;
  }

  /**
   * Produces dependency metadata for visualization / inspection.
   */
  getGraphInfo(cells: CellMap): DependencyNodeInfo[] {
    const cycleCells = this.detectCycles();
    const result: DependencyNodeInfo[] = [];

    const allKeys = new Set([
      ...Object.keys(cells),
      ...this.precedents.keys(),
      ...this.dependents.keys(),
    ]);

    for (const key of allKeys) {
      const precs = Array.from(this.precedents.get(key) || []);
      const deps = Array.from(this.dependents.get(key) || []);
      const cell = cells[key];

      result.push({
        cellKey: key,
        precedents: precs,
        dependents: deps,
        hasCycle: cycleCells.has(key),
        rawFormula: cell?.raw,
        evaluatedValue: cell?.value,
        error: cell?.error,
      });
    }

    return result.sort((a, b) => a.cellKey.localeCompare(b.cellKey));
  }
}
