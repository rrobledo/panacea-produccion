import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProveedoresPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/proveedores');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/proveedores/${id}`), {
    onSuccess: () => { toast.success('Proveedor eliminado correctamente'); refetch(); },
    onError: () => toast.error('Error al eliminar el proveedor'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar el proveedor "${row.nombre}"?`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'cuit', header: 'CUIT' },
    { accessorKey: 'telefono', header: 'Teléfono' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/proveedores/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Proveedores</div>
          <div className="page-subtitle">Gestión de proveedores</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/proveedores/create')}>
          <Plus size={14} /> Nuevo Proveedor
        </button>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Proveedores" emptyText="No hay proveedores registrados" />

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
