import { useState, useCallback } from 'react';

/**
 * Server-driven-column editable table: tracks only changed cells and saves
 * a diffed payload (one entry per changed row, only the changed fields + id).
 * Used by Planning and Programación, replacing ag-Grid's inline cell editing.
 */
export const EditableGrid = ({ columns, rows, rowIdField = 'id', onSave, saving = false }) => {
  const [edited, setEdited] = useState({});

  const handleChange = (rowId, field, value) => {
    setEdited(prev => ({ ...prev, [rowId]: { ...prev[rowId], [field]: value } }));
  };

  const hasChanges = Object.keys(edited).length > 0;

  const handleSave = useCallback(() => {
    const changedRows = Object.entries(edited).map(([id, fields]) => {
      const numericId = Number(id);
      return { id: Number.isNaN(numericId) ? id : numericId, ...fields };
    });
    onSave(changedRows);
    setEdited({});
  }, [edited, onSave]);

  const getValue = (row, col) => edited[row[rowIdField]]?.[col.field] ?? row[col.field];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{rows.length} filas</h3>
        <button className="btn btn-primary btn-sm" disabled={!hasChanges || saving} onClick={handleSave}>
          {saving ? 'Guardando…' : 'Actualizar'}
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>{columns.map(col => <th key={col.field}>{col.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Sin datos</td></tr>
            ) : rows.map(row => {
              const id = row[rowIdField];
              return (
                <tr key={id} data-row-id={id}>
                  {columns.map(col => {
                    const val = getValue(row, col);
                    const dirty = edited[id]?.[col.field] !== undefined;
                    if (!col.editable) {
                      return <td key={col.field}>{col.render ? col.render(val, row) : val}</td>;
                    }
                    return (
                      <td key={col.field} className={`cell-editable ${dirty ? 'cell-dirty' : ''}`}>
                        <input
                          type={col.type || 'number'}
                          value={val ?? ''}
                          onChange={e => handleChange(
                            id, col.field,
                            col.type === 'text' ? e.target.value : Number(e.target.value)
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
