import { useState } from 'react';
import { DataGrid } from '../../components/grid/DataGrid';
import { ErrorState } from '../../components/ui';
import { useFetch } from '../../hooks';
import { formatCurrencyARS } from '../../utils/format';
import { MESES_CON_TODOS } from './constants';
import { getErrorMessage } from '../../utils/errorMessage';

const money = { cell: ({ getValue }) => formatCurrencyARS(getValue()) };

export const EstimacionesPage = () => {
  const [mes, setMes] = useState(0);
  const { data, loading, error, refetch } = useFetch('/costos/precio_productos', { mes: mes || undefined });

  const applyFilter = (value) => {
    setMes(value);
    refetch({ mes: value || undefined });
  };

  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={() => applyFilter(mes)} />;

  const columns = [
    { accessorKey: 'producto_nombre', header: 'Producto' },
    { accessorKey: 'costo_unitario_mp', header: 'Costo MP', ...money },
    { accessorKey: 'costo_unitario_mo', header: 'Costo MO', ...money },
    { accessorKey: 'costo_unitario_fab_new', header: 'Costo Fabricación', ...money },
    { accessorKey: 'costo_total_new', header: 'Costo Total', ...money },
    { accessorKey: 'precio_sugerido', header: 'Precio Fabricación', ...money },
    { accessorKey: 'precio_sugerido_final', header: 'Precio Sugerido Local', ...money },
    { accessorKey: 'precio_va', header: 'Precio Local', ...money },
    { accessorKey: 'plan', header: 'Plan' },
    { accessorKey: 'ganancia_fab_new', header: 'Ganancia Fabricación', ...money },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Estimaciones</div>
          <div className="page-subtitle">Costos y precios estimados por producto</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body form-row">
          <div className="form-group field-w-md">
            <label className="form-label">Mes</label>
            <select className="form-select" value={mes} onChange={e => applyFilter(Number(e.target.value))}>
              {MESES_CON_TODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <DataGrid columns={columns} data={data || []} loading={loading} title="Estimaciones" showExport emptyText="No hay estimaciones disponibles" />
    </div>
  );
};
