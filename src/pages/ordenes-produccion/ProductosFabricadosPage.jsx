import { PageLoader, ErrorState } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { DataGrid } from '../../components/grid/DataGrid';
import { useList } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProductosFabricadosPage = () => {
  const { items, loading, error, params, filter, refetch } = useList('/costos/productos_fabricados', {});

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const totalDesperdicio = items.reduce((sum, row) => sum + (row.cantidad_desperdicio || 0), 0);

  const columns = [
    { accessorKey: 'orden_codigo', header: 'Orden' },
    { id: 'producto', header: 'Producto', accessorFn: row => row.producto?.nombre },
    { accessorKey: 'cantidad_fabricada', header: 'Cantidad Fabricada' },
    { id: 'ubicacion', header: 'Ubicación', accessorFn: row => row.ubicacion?.nombre },
    { accessorKey: 'cantidad_desperdicio', header: 'Cant. Desperdicio' },
    { id: 'ubicacion_desperdicio', header: 'Ubicación Desperdicio', accessorFn: row => row.ubicacion_desperdicio?.nombre || '—' },
    { accessorKey: 'motivo_desperdicio', header: 'Motivo', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'fecha', header: 'Fecha', cell: ({ getValue }) => new Date(getValue()).toLocaleString('es-AR') },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Producto Fabricado</div>
          <div className="page-subtitle">Registro de lo finalizado en cada orden de producción</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body form-row">
          <div className="form-group">
            <label className="form-label">Producto</label>
            <EntityPicker
              resource="/costos/productos"
              searchField="nombre"
              value={params.producto_id || null}
              onChange={(v) => filter({ producto_id: v || undefined })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ubicación</label>
            <EntityPicker
              resource="/costos/ubicaciones"
              searchField="nombre"
              value={params.ubicacion_id || null}
              onChange={(v) => filter({ ubicacion_id: v || undefined })}
            />
          </div>
          <div className="form-group field-w-sm">
            <label className="form-label">Desde</label>
            <input
              type="date" className="form-input"
              value={params.fecha_desde || ''}
              onChange={(e) => filter({ fecha_desde: e.target.value || undefined })}
            />
          </div>
          <div className="form-group field-w-sm">
            <label className="form-label">Hasta</label>
            <input
              type="date" className="form-input"
              value={params.fecha_hasta || ''}
              onChange={(e) => filter({ fecha_hasta: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Total Desperdicio
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalDesperdicio}</div>
        </div>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Producto Fabricado" emptyText="No hay registros" />
    </div>
  );
};
