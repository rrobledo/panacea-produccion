import { useState } from 'react';
import { useFetch, useMutation } from '../../hooks';
import { EditableGrid } from '../../components/grid/EditableGrid';
import { PageLoader, ErrorState } from '../../components/ui';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { flattenColumns, inferColumnTypes } from '../../utils/gridColumns';
import { getErrorMessage } from '../../utils/errorMessage';
import { recentYears } from '../../utils/years';

const YEARS = recentYears();

export const PlanningPage = () => {
  const toast = useToast();
  const [anio, setAnio] = useState(new Date().getFullYear());

  const { data: columnsTree, loading: loadingCols, error: errCols, refetch: refetchCols } = useFetch('/costos/planning_columnas', { anio });
  const { data: rows, loading: loadingRows, error: errRows, refetch: refetchRows } = useFetch('/costos/planning', { anio });

  const { mutate: save, loading: saving } = useMutation(
    (changedRows) => api.post('/costos/planning', changedRows),
    {
      onSuccess: () => { toast.success('Planning actualizado correctamente'); refetchRows({ anio }); },
      onError: () => toast.error('Error al actualizar el planning'),
    }
  );

  const handleAnioChange = (value) => {
    const newAnio = Number(value);
    setAnio(newAnio);
    refetchCols({ anio: newAnio });
    refetchRows({ anio: newAnio });
  };

  if (loadingCols || loadingRows) return <PageLoader />;
  if (errCols || errRows) {
    return <ErrorState message={getErrorMessage(errCols || errRows)} onRetry={() => { refetchCols({ anio }); refetchRows({ anio }); }} />;
  }

  const columns = inferColumnTypes(flattenColumns(columnsTree || []), rows || []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Planning</div>
          <div className="page-subtitle">Planificación anual de producción</div>
        </div>
        <select className="form-select" style={{ width: 120 }} value={anio} onChange={e => handleAnioChange(e.target.value)}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <EditableGrid columns={columns} rows={rows || []} onSave={save} saving={saving} />
    </div>
  );
};
