import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const UbicacionesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/ubicaciones');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/ubicaciones/${id}`), {
    onSuccess: () => { toast.success('Ubicación eliminada correctamente'); refetch(); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al eliminar la ubicación'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar la ubicación "${row.nombre}"?`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/ubicaciones/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Ubicaciones</div>
          <div className="page-subtitle">Depósitos y sectores donde se guarda el producto terminado</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/ubicaciones/create')}>
          <Plus size={14} /> Nueva Ubicación
        </button>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Ubicaciones" emptyText="No hay ubicaciones registradas" />

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        onConfirm={() => resolve(true)}
        onCancel={() => resolve(false)}
      />
    </div>
  );
};
