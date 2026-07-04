import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState } from '../../components/ui';
import { useList } from '../../hooks';
import { formatCurrencyARS, formatPercent } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const money = { cell: ({ getValue }) => formatCurrencyARS(getValue()) };

export const CostosMateriaPrimaPage = () => {
  const navigate = useNavigate();
  const { items, loading, error, refetch } = useList('/costos/costos_materia_prima');

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'producto_nombre', header: 'Producto' },
    { accessorKey: 'lote_produccion', header: 'Lote Producción' },
    { accessorKey: 'tiempo_produccion', header: 'Tiempo Producción' },
    { accessorKey: 'precio_actual', header: 'Precio Venta', ...money },
    { accessorKey: 'costo_unitario_mp', header: 'Costo MP', ...money },
    { accessorKey: 'margen_utilidad', header: 'Margen Utilidad MP', cell: ({ getValue }) => formatPercent(getValue()) },
    { accessorKey: 'venta_estimada_mensual', header: 'Ventas Estimada Mensual', ...money },
    { accessorKey: 'costo_estimado_mensual', header: 'Costo Estimado Mensual', ...money },
    { accessorKey: 'total_utilidad_mensual', header: 'Utilidad Estimada Mensual', ...money },
    { accessorKey: 'utilidad_mensual', header: 'Utilidad Mensual', cell: ({ getValue }) => formatPercent(getValue()) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reportes/costo-materia-prima/${row.original.producto_id}`)}>Ver detalle</button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Costo Materia Prima</div>
          <div className="page-subtitle">Análisis de costo de materia prima por producto</div>
        </div>
      </div>
      <DataGrid columns={columns} data={items} loading={loading} title="Costo Materia Prima" showExport emptyText="No hay datos de costos disponibles" />
    </div>
  );
};
