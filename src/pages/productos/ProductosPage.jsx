import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProductosPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/productos');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/productos/${id}`), {
    onSuccess: () => { toast.success('Producto eliminado correctamente'); refetch(); },
    onError: () => toast.error('Error al eliminar el producto'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar el producto "${row.nombre}"?`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoría' },
    { accessorKey: 'lote_produccion', header: 'Lote Producción' },
    { accessorKey: 'unidad_medida', header: 'Medida' },
    { accessorKey: 'tiempo_produccion', header: 'Tiempo Producción' },
    { accessorKey: 'habilitado', header: 'Habilitado', cell: ({ getValue }) => getValue() ? <Check size={16} color="var(--success)" /> : null },
    { accessorKey: 'prioridad', header: 'Prioridad' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/productos/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Productos</div>
          <div className="page-subtitle">Gestión de productos</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/productos/create')}>
          <Plus size={14} /> Nuevo Producto
        </button>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Productos" emptyText="No hay productos registrados" />

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
