import { useEffect, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useFetch, useMutation } from '../../hooks';
import { PageLoader, ErrorState } from '../../components/ui';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MESES, SEMANAS, RESPONSABLES } from './constants';
import { getErrorMessage } from '../../utils/errorMessage';
import { recentYears } from '../../utils/years';

ModuleRegistry.registerModules([AllCommunityModule]);

const YEARS = recentYears();
const now = new Date();
const defaultColDef = { width: 70 };

export const ProgramacionPage = () => {
  const toast = useToast();
  const [filters, setFilters] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1, semana: 0, responsable: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const gridRef = useRef(null);
  const updatesRef = useRef(new Map());
  const oldRowsRef = useRef([]);

  // Wraps each leaf column's own cellStyle (e.g. the backend's static
  // silver background on "Planeado" columns) so a dirty cell highlights
  // cyan without permanently overriding — and without ag-Grid's own
  // static cellStyle silently winning and hiding the highlight — the
  // column's normal styling for its other (unedited) cells.
  const withDirtyHighlight = (nodes) => (nodes || []).map(node => {
    if (node.children) return { ...node, children: withDirtyHighlight(node.children) };
    if (!node.field) return node;
    const originalCellStyle = node.cellStyle;
    return {
      ...node,
      cellStyle: (params) => {
        const rowEdits = updatesRef.current.get(params.data?.id);
        const isDirty = rowEdits && Object.prototype.hasOwnProperty.call(rowEdits, params.colDef.field);
        if (isDirty) return { backgroundColor: 'cyan' };
        return typeof originalCellStyle === 'function' ? originalCellStyle(params) : (originalCellStyle || null);
      },
    };
  });

  // The backend treats `responsable=""` as "match empty string" rather than
  // "no filter" — omit it entirely when unset ("Todos").
  const rowParams = { anio: filters.anio, mes: filters.mes, semana: filters.semana, responsable: filters.responsable || undefined };
  const colParams = { anio: filters.anio, mes: filters.mes, semana: filters.semana };

  const { data: columnsTree, loading: loadingCols, error: errCols, refetch: refetchCols } = useFetch('/costos/programacion_columnas', colParams);
  const { data: rows, loading: loadingRows, error: errRows, refetch: refetchRows } = useFetch('/costos/programacion', rowParams);

  const clearEdits = () => {
    updatesRef.current = new Map();
    setHasChanges(false);
    gridRef.current?.api?.refreshCells({ force: true });
  };

  const { mutate: save, loading: saving } = useMutation(
    (changedRows) => api.post('/costos/programacion', changedRows),
    {
      onSuccess: () => {
        toast.success('Programación actualizada correctamente');
        clearEdits();
        refetchRows(rowParams);
      },
      onError: () => toast.error('Error al actualizar la programación'),
    }
  );

  // Snapshot the freshly-fetched rows so edited cells can be diffed against
  // their original value before saving (only changed fields are sent).
  useEffect(() => {
    oldRowsRef.current = (rows || []).map(r => ({ ...r }));
  }, [rows]);

  // Column groups come from the backend as an ag-Grid ColGroupDef tree —
  // set imperatively via the grid API (not as a controlled prop) so
  // in-progress dirty-cell highlighting survives unrelated re-renders.
  useEffect(() => {
    gridRef.current?.api?.setGridOption('columnDefs', withDirtyHighlight(columnsTree));
  }, [columnsTree]);

  const applyFilters = () => {
    clearEdits();
    refetchCols(colParams);
    refetchRows(rowParams);
  };

  const onGridReady = (params) => {
    params.api.setGridOption('columnDefs', withDirtyHighlight(columnsTree));
  };

  const onCellValueChanged = (event) => {
    const field = event.colDef.field;
    const id = event.data.id;
    const original = oldRowsRef.current.find(r => r.id === id);
    const next = { ...updatesRef.current.get(id) };
    if (original && event.data[field] === original[field]) {
      // Edited back to the original value — no longer a real change.
      delete next[field];
    } else {
      next[field] = event.data[field];
    }
    if (Object.keys(next).length === 0) {
      updatesRef.current.delete(id);
    } else {
      updatesRef.current.set(id, next);
    }
    setHasChanges(updatesRef.current.size > 0);
    event.api.refreshCells({ force: true, columns: [field], rowNodes: [event.node] });
  };

  const handleSave = () => {
    const changedRows = [];
    updatesRef.current.forEach((changedFields, id) => {
      const original = oldRowsRef.current.find(r => r.id === id);
      if (!original) return;
      changedRows.push({ id, responsable: original.responsable, ...changedFields });
    });
    save(changedRows);
  };

  if (loadingCols || loadingRows) return <PageLoader />;
  if (errCols || errRows) {
    return <ErrorState message={getErrorMessage(errCols || errRows)} onRetry={applyFilters} />;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Programación</div>
          <div className="page-subtitle">Programación semanal de producción</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body form-row">
          <div className="form-group field-w-xs">
            <label className="form-label">Año</label>
            <select className="form-select" value={filters.anio} onChange={e => setFilters(f => ({ ...f, anio: Number(e.target.value) }))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Mes</label>
            <select className="form-select" value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: Number(e.target.value) }))}>
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Semana</label>
            <select className="form-select" value={filters.semana} onChange={e => setFilters(f => ({ ...f, semana: Number(e.target.value) }))}>
              {SEMANAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Responsable</label>
            <select className="form-select" value={filters.responsable} onChange={e => setFilters(f => ({ ...f, responsable: e.target.value }))}>
              {RESPONSABLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={applyFilters}>Aplicar Filtros</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{(rows || []).length} filas</h3>
          <button className="btn btn-primary btn-sm" disabled={!hasChanges || saving} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Actualizar'}
          </button>
        </div>
        <div className="ag-theme-quartz" style={{ width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={rows || []}
            defaultColDef={defaultColDef}
            onCellValueChanged={onCellValueChanged}
            onGridReady={onGridReady}
            getRowHeight={() => 25}
            domLayout="autoHeight"
          />
        </div>
      </div>
    </div>
  );
};
