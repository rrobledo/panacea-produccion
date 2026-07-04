import { useState } from 'react';
import { useFetch, useMutation } from '../../hooks';
import { EditableGrid } from '../../components/grid/EditableGrid';
import { PageLoader, ErrorState } from '../../components/ui';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { flattenColumns, inferColumnTypes } from '../../utils/gridColumns';
import { MESES, SEMANAS, RESPONSABLES } from './constants';
import { getErrorMessage } from '../../utils/errorMessage';
import { recentYears } from '../../utils/years';

const YEARS = recentYears();
const now = new Date();

export const ProgramacionPage = () => {
  const toast = useToast();
  const [filters, setFilters] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1, semana: 0, responsable: '' });

  // The backend treats `responsable=""` as "match empty string" rather than
  // "no filter" — omit it entirely when unset ("Todos").
  const rowParams = { anio: filters.anio, mes: filters.mes, semana: filters.semana, responsable: filters.responsable || undefined };
  const colParams = { anio: filters.anio, mes: filters.mes, semana: filters.semana };

  const { data: columnsTree, loading: loadingCols, error: errCols, refetch: refetchCols } = useFetch('/costos/programacion_columnas', colParams);
  const { data: rows, loading: loadingRows, error: errRows, refetch: refetchRows } = useFetch('/costos/programacion', rowParams);

  const { mutate: save, loading: saving } = useMutation(
    (changedRows) => api.post('/costos/programacion', changedRows),
    {
      onSuccess: () => { toast.success('Programación actualizada correctamente'); refetchRows(rowParams); },
      onError: () => toast.error('Error al actualizar la programación'),
    }
  );

  const applyFilters = () => {
    refetchCols(colParams);
    refetchRows(rowParams);
  };

  if (loadingCols || loadingRows) return <PageLoader />;
  if (errCols || errRows) {
    return <ErrorState message={getErrorMessage(errCols || errRows)} onRetry={applyFilters} />;
  }

  const columns = inferColumnTypes(flattenColumns(columnsTree || []), rows || []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Programación</div>
          <div className="page-subtitle">Programación semanal de producción</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body grid-4">
          <div className="form-group">
            <label className="form-label">Año</label>
            <select className="form-select" value={filters.anio} onChange={e => setFilters(f => ({ ...f, anio: Number(e.target.value) }))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mes</label>
            <select className="form-select" value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: Number(e.target.value) }))}>
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Semana</label>
            <select className="form-select" value={filters.semana} onChange={e => setFilters(f => ({ ...f, semana: Number(e.target.value) }))}>
              {SEMANAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
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

      <EditableGrid columns={columns} rows={rows || []} onSave={save} saving={saving} />
    </div>
  );
};
