import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../formula/dependency';
import type { CellMap } from '../types/spreadsheet';

describe('Dependency Tracking & Automatic Recalculation', () => {
  it('correctly tracks precedents and dependents for formulas', () => {
    const graph = new DependencyGraph();
    const refs = graph.updateCellDependencies('C1', '=A1 + B1');
    expect(refs).toEqual(new Set(['A1', 'B1']));

    const rangeRefs = graph.updateCellDependencies('D1', '=SUM(A1:B2)');
    expect(rangeRefs).toEqual(new Set(['A1', 'B1', 'A2', 'B2']));
  });

  it('recalculates dependent cells in correct topological order', () => {
    const graph = new DependencyGraph();

    const initialCells: CellMap = {
      A1: { raw: '10', value: 10, display: '10' },
      B1: { raw: '=A1 * 2', value: null, display: '' },
      C1: { raw: '=B1 + 5', value: null, display: '' },
    };

    const calculated = graph.recalculateSpreadsheet(initialCells);

    expect(calculated['B1'].value).toBe(20);
    expect(calculated['B1'].display).toBe('20');
    expect(calculated['C1'].value).toBe(25);
    expect(calculated['C1'].display).toBe('25');
  });

  it('cascades updates downstream when a cell value changes', () => {
    const graph = new DependencyGraph();

    const cells: CellMap = {
      A1: { raw: '10', value: 10, display: '10' },
      B1: { raw: '=A1 * 3', value: 30, display: '30' },
      C1: { raw: '=B1 + 10', value: 40, display: '40' },
    };

    // User updates A1 to 5
    cells['A1'] = { raw: '5', value: 5, display: '5' };

    const recalculated = graph.recalculateSpreadsheet(cells, ['A1']);

    expect(recalculated['B1'].value).toBe(15);
    expect(recalculated['C1'].value).toBe(25);
  });

  it('detects self-referencing circular references and assigns #CIRCULAR!', () => {
    const graph = new DependencyGraph();

    const cells: CellMap = {
      A1: { raw: '=A1 + 1', value: null, display: '' },
    };

    const recalculated = graph.recalculateSpreadsheet(cells);

    expect(recalculated['A1'].error).toBe('#CIRCULAR!');
    expect(recalculated['A1'].display).toBe('#CIRCULAR!');
  });

  it('detects multi-cell circular references (A1 -> B1 -> A1) and prevents infinite loops', () => {
    const graph = new DependencyGraph();

    const cells: CellMap = {
      A1: { raw: '=B1 + 5', value: null, display: '' },
      B1: { raw: '=A1 * 2', value: null, display: '' },
      C1: { raw: '100', value: 100, display: '100' }, // Independent cell should not be affected
    };

    const recalculated = graph.recalculateSpreadsheet(cells);

    expect(recalculated['A1'].error).toBe('#CIRCULAR!');
    expect(recalculated['B1'].error).toBe('#CIRCULAR!');
    expect(recalculated['C1'].value).toBe(100);
    expect(recalculated['C1'].error).toBeFalsy();
  });

  it('detects 3-cell circular loops (A1 -> B1 -> C1 -> A1)', () => {
    const graph = new DependencyGraph();

    const cells: CellMap = {
      A1: { raw: '=B1 + 1', value: null, display: '' },
      B1: { raw: '=C1 + 1', value: null, display: '' },
      C1: { raw: '=A1 + 1', value: null, display: '' },
    };

    const recalculated = graph.recalculateSpreadsheet(cells);

    expect(recalculated['A1'].error).toBe('#CIRCULAR!');
    expect(recalculated['B1'].error).toBe('#CIRCULAR!');
    expect(recalculated['C1'].error).toBe('#CIRCULAR!');
  });

  it('provides complete dependency inspection information for visualization', () => {
    const graph = new DependencyGraph();

    const cells: CellMap = {
      A1: { raw: '50', value: 50, display: '50' },
      B1: { raw: '=A1 * 2', value: 100, display: '100' },
    };

    graph.recalculateSpreadsheet(cells);
    const info = graph.getGraphInfo(cells);

    const b1Info = info.find((n) => n.cellKey === 'B1');
    expect(b1Info).toBeDefined();
    expect(b1Info?.precedents).toContain('A1');
    expect(b1Info?.hasCycle).toBe(false);

    const a1Info = info.find((n) => n.cellKey === 'A1');
    expect(a1Info).toBeDefined();
    expect(a1Info?.dependents).toContain('B1');
  });
});
