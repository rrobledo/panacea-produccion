import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrencyARS } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

export const InsumosPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/insumos');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/insumos/${id}`), {
    onSuccess: () => { toast.success('Insumo eliminado correctamente'); refetch(); },
    onError: () => toast.error('Error al eliminar el insumo'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar el insumo "${row.nombre}"?`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'cantidad', header: 'Cantidad' },
    { accessorKey: 'unidad_medida', header: 'Unidad de Medida' },
    { accessorKey: 'precio', header: 'Precio', cell: ({ getValue }) => formatCurrencyARS(getValue()) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/insumos/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Insumos</div>
          <div className="page-subtitle">Gestión de materias primas</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/insumos/create')}>
          <Plus size={14} /> Nuevo Insumo
        </button>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Insumos" emptyText="No hay insumos registrados" />

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
