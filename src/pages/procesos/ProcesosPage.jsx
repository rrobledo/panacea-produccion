import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { tipoLabel } from './constants';

export const ProcesosPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/procesos');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/procesos/${id}`), {
    onSuccess: () => { toast.success('Proceso eliminado correctamente'); refetch(); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al eliminar el proceso'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar el proceso "${row.nombre}"?`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'codigo', header: 'Código' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { id: 'tipo', header: 'Tipo', cell: ({ row }) => tipoLabel(row.original.tipo) },
    { accessorKey: 'responsable', header: 'Responsable' },
    {
      id: 'lote', header: 'Lote',
      cell: ({ row }) => `${row.original.lote_referencia} ${row.original.lote_unidad}`,
    },
    {
      id: 'lineas', header: 'Líneas',
      cell: ({ row }) => row.original.lineas?.length ?? 0,
    },
    { accessorKey: 'version', header: 'Versión' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/procesos/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Procesos</div>
          <div className="page-subtitle">
            Cómo se fabrica cada cosa: qué consume, qué produce y con qué gramaje se parte
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/procesos/create')}>
          <Plus size={14} /> Nuevo Proceso
        </button>
      </div>

      <DataGrid
        columns={columns} data={items} loading={loading} title="Procesos"
        emptyText="No hay procesos cargados"
      />

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
