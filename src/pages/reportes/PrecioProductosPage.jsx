import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState } from '../../components/ui';
import { useList } from '../../hooks';
import { formatCurrencyARS } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const money = { cell: ({ getValue }) => formatCurrencyARS(getValue()) };

export const PrecioProductosPage = () => {
  const { items, loading, error, refetch } = useList('/costos/precio_productos');

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'producto_nombre', header: 'Producto' },
    { accessorKey: 'precio_va', header: 'Precio VA', ...money },
    { accessorKey: 'precio_cp', header: 'Precio CP', ...money },
    { accessorKey: 'costo_unitario_mp', header: 'Costo MP', ...money },
    { accessorKey: 'costo_unitario_fab', header: 'Costo Fabricación', ...money },
    { accessorKey: 'costo_total', header: 'Costo Total', ...money },
    { accessorKey: 'ganancia_va', header: 'Ganancia VA', ...money },
    { accessorKey: 'ganancia_cp', header: 'Ganancia CP', ...money },
    { accessorKey: 'ganancia_fab', header: 'Ganancia Fabricación', ...money },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Precio Productos</div>
          <div className="page-subtitle">Precios y márgenes actuales</div>
        </div>
      </div>
      <DataGrid columns={columns} data={items} loading={loading} title="Precio Productos" showExport emptyText="No hay datos de precios disponibles" />
    </div>
  );
};
