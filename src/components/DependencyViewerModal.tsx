import React, { useState, useMemo } from 'react';
import { useSpreadsheet } from '../context/useSpreadsheet';
import {
  X,
  Network,
  AlertTriangle,
  Search,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

export const DependencyViewerModal: React.FC = () => {
  const { showDepViewer, setShowDepViewer, getDependencyInfo } = useSpreadsheet();
  const [searchQuery, setSearchQuery] = useState('');

  const graphInfo = useMemo(() => {
    if (!showDepViewer) return [];
    return getDependencyInfo();
  }, [showDepViewer, getDependencyInfo]);

  if (!showDepViewer) return null;

  // Filter formula or connected cells
  const formulaNodes = graphInfo.filter(
    (n) => (n.rawFormula && n.rawFormula.startsWith('=')) || n.dependents.length > 0
  );

  const filteredNodes = formulaNodes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toUpperCase();
    return (
      n.cellKey.includes(q) ||
      (n.rawFormula && n.rawFormula.toUpperCase().includes(q)) ||
      n.precedents.some((p) => p.includes(q)) ||
      n.dependents.some((d) => d.includes(q))
    );
  });

  const cycleNodes = graphInfo.filter((n) => n.hasCycle);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dep-modal-title">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Network size={20} />
            </div>
            <div>
              <h2 id="dep-modal-title" className="modal-title">Dependency Graph & Recalculation Strategy</h2>
              <p className="modal-subtitle">
                Inspect formulas, precedent cells, dependent chains, and topological evaluation order
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setShowDepViewer(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cycle Alert Banner if any */}
        {cycleNodes.length > 0 && (
          <div className="alert-banner-error" role="alert">
            <AlertTriangle size={20} className="alert-icon" />
            <div>
              <div className="alert-heading">Circular Reference Detected!</div>
              <div className="alert-description">
                The following cells form an infinite calculation cycle and were safely marked with{' '}
                <code>#CIRCULAR!</code> to prevent stack overflows:{' '}
                <strong>{cycleNodes.map((c) => c.cellKey).join(', ')}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="modal-body">
          {/* Strategy explanation card */}
          <section className="strategy-card">
            <div className="strategy-header">
              <Cpu size={18} />
              <h3>Recalculation Strategy (Directed Acyclic Graph)</h3>
            </div>
            <div className="strategy-content">
              <div className="strategy-step">
                <span className="step-num">1</span>
                <div>
                  <strong>AST Lexing & Parsing:</strong> Formulas are safely parsed into an Abstract
                  Syntax Tree without <code>eval()</code>, cleanly unpacking single cell references (
                  <code>A1</code>) and ranges (<code>A1:B5</code>).
                </div>
              </div>
              <div className="strategy-step">
                <span className="step-num">2</span>
                <div>
                  <strong>Cycle Detection:</strong> Prior to evaluation, a 3-color DFS graph
                  traversal flags any cyclic references (e.g., <code>A1=B1+1</code>,{' '}
                  <code>B1=A1+1</code>). Cycles are halted and isolated with <code>#CIRCULAR!</code>.
                </div>
              </div>
              <div className="strategy-step">
                <span className="step-num">3</span>
                <div>
                  <strong>Topological Sort:</strong> Cells are sorted using Kahn's algorithm so that
                  every precedent cell is evaluated before any dependent formula that reads from it.
                </div>
              </div>
              <div className="strategy-step">
                <span className="step-num">4</span>
                <div>
                  <strong>Reactive Incremental Updates:</strong> When a user edits cell <code>X</code>,
                  only <code>X</code> and its transitive downstream dependents are re-evaluated, keeping
                  large 1,000-row sheets fast and responsive.
                </div>
              </div>
            </div>
          </section>

          {/* Search bar */}
          <div className="dep-search-row">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search cell (e.g. B6, SUM, or category)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter formula dependency cells"
              />
            </div>
            <span className="badge-count">
              {filteredNodes.length} formula / dependent node{filteredNodes.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Graph Nodes Table */}
          <div className="nodes-table-wrapper">
            {filteredNodes.length === 0 ? (
              <div className="empty-nodes-state">
                <CheckCircle2 size={32} className="text-muted" />
                <p>No formula dependencies match your search or current sheet.</p>
              </div>
            ) : (
              <table className="dep-table">
                <thead>
                  <tr>
                    <th>Cell</th>
                    <th>Formula / Content</th>
                    <th>Evaluated Result</th>
                    <th>Precedents (Depends on)</th>
                    <th>Dependents (Feeds into)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map((node) => {
                    const isCycle = node.hasCycle;
                    const hasError = Boolean(node.error);

                    return (
                      <tr key={node.cellKey} className={isCycle ? 'row-cycle' : ''}>
                        <td>
                          <span className="cell-key-pill">{node.cellKey}</span>
                        </td>
                        <td>
                          <code className="formula-code">{node.rawFormula || '(literal)'}</code>
                        </td>
                        <td>
                          <span className={hasError ? 'text-error font-mono' : 'font-mono'}>
                            {String(node.evaluatedValue ?? '')}
                          </span>
                        </td>
                        <td>
                          {node.precedents.length > 0 ? (
                            <div className="ref-tags">
                              {node.precedents.map((p) => (
                                <span key={p} className="ref-tag ref-precedent">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {node.dependents.length > 0 ? (
                            <div className="ref-tags">
                              {node.dependents.map((d) => (
                                <span key={d} className="ref-tag ref-dependent">
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {isCycle ? (
                            <span className="status-tag status-error">Circular Loop</span>
                          ) : hasError ? (
                            <span className="status-tag status-error">{node.error}</span>
                          ) : (
                            <span className="status-tag status-ok">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowDepViewer(false)}
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
