import { useNavigate } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, Select } from '../../components/ui';
import { useList } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';
import { ESTADO_BADGE, ESTADO_LABELS, ESTADO_OPTIONS } from './constants';

export const OrdenesProduccionPage = () => {
  const navigate = useNavigate();
  const { items, loading, error, params, filter, refetch } = useList('/costos/ordenes-produccion', {});

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'codigo', header: 'Código' },
    { accessorKey: 'fecha_fabricacion', header: 'Fecha de Fabricación' },
    { accessorKey: 'responsable', header: 'Responsable' },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => (
        <span className={`badge badge-${ESTADO_BADGE[getValue()] || 'gray'}`}>{ESTADO_LABELS[getValue()] || getValue()}</span>
      ),
    },
    {
      id: 'productos', header: 'Productos',
      cell: ({ row }) => row.original.productos.map(p => p.producto?.nombre).filter(Boolean).join(', '),
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/ordenes-produccion/${row.original.id}`)}>Ver</button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Órdenes de Producción</div>
          <div className="page-subtitle">Generadas desde la Programación de la fecha que elijas</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/ordenes-produccion/generar')}>
          <Wand2 size={14} /> Generar Órdenes
        </button>
      </div>

      <DataGrid
        columns={columns}
        data={items}
        loading={loading}
        title="Órdenes de Producción"
        emptyText="No hay órdenes de producción registradas"
        onRowClick={(row) => navigate(`/ordenes-produccion/${row.id}`)}
        actions={
          <>
            <input
              type="date"
              className="form-input"
              style={{ width: 160 }}
              value={params.fecha_fabricacion || ''}
              onChange={(e) => filter({ fecha_fabricacion: e.target.value || undefined })}
            />
            <Select
              options={ESTADO_OPTIONS}
              value={params.estado || ''}
              onChange={(v) => filter({ estado: v || undefined })}
              placeholder="Estado: Todos"
              style={{ width: 180 }}
            />
          </>
        }
      />
    </div>
  );
};
