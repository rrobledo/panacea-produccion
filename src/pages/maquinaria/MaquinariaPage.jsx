import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { useList, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { tipoLabel, estadoLabel } from './constants';

const BADGE_ESTADO = { ACTIVA: 'success', MANTENIMIENTO: 'warning', BAJA: 'gray' };

export const MaquinariaPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/maquinas');
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: remove } = useMutation((id) => api.delete(`/costos/maquinas/${id}`), {
    onSuccess: () => { toast.success('Máquina eliminada correctamente'); refetch(); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al eliminar la máquina'),
  });

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar "${row.nombre}"? Si ya se usó en una orden, conviene ponerla en Baja.`,
    });
    if (ok) remove(row.id);
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'codigo', header: 'Código' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { id: 'tipo', header: 'Tipo', cell: ({ row }) => tipoLabel(row.original.tipo) },
    {
      id: 'capacidad', header: 'Capacidad',
      cell: ({ row }) => `${row.original.capacidad} ${row.original.capacidad_unidad}`,
    },
    {
      id: 'tiempos', header: 'Setup + limpieza',
      cell: ({ row }) => `${row.original.minutos_setup} + ${row.original.minutos_limpieza} min`,
    },
    { accessorKey: 'area', header: 'Área' },
    {
      id: 'estado', header: 'Estado',
      cell: ({ row }) => (
        <span className={`badge badge-${BADGE_ESTADO[row.original.estado] || 'gray'}`}>
          {estadoLabel(row.original.estado)}
        </span>
      ),
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/maquinaria/${row.original.id}/edit`)}>Editar</button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row.original)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Maquinaria</div>
          <div className="page-subtitle">
            Con qué se produce. Las recetas apuntan a un tipo de máquina, no a una en particular.
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/maquinaria/create')}>
          <Plus size={14} /> Nueva Máquina
        </button>
      </div>

      <DataGrid columns={columns} data={items} loading={loading} title="Máquinas" emptyText="No hay máquinas cargadas" />

      <ConfirmDialog
        open={!!dialog} title={dialog?.title} message={dialog?.message}
        onConfirm={() => resolve(true)} onCancel={() => resolve(false)}
      />
    </div>
  );
};
