import { useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { Wand2 } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, Select } from '../../components/ui';
import { useList, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { ESTADO_BADGE, ESTADO_LABELS, ESTADO_OPTIONS } from './constants';

export const OrdenesProduccionPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, params, filter, refetch } = useList('/costos/ordenes-produccion', {});

  const { mutate: generar, loading: generando } = useMutation(
    (fecha) => api.post('/costos/ordenes-produccion/generar', { fecha }),
    {
      onSuccess: (res) => {
        toast.success(`${res.data.length} orden(es) de producción generada(s)`);
        refetch();
      },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al generar las órdenes'),
    }
  );

  const handleGenerar = () => {
    const manana = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    generar(manana);
  };

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
          <div className="page-subtitle">Generadas desde la Programación del día siguiente</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleGenerar} disabled={generando}>
          <Wand2 size={14} /> {generando ? 'Generando…' : 'Generar Órdenes de Mañana'}
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
