import { useNavigate, useParams } from 'react-router-dom';
import { Play, XCircle, ArrowLeft } from 'lucide-react';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { OblejaPrint } from './OblejaPrint';
import { FinalizarOrdenSection } from './FinalizarOrdenSection';
import { ESTADO_BADGE, ESTADO_LABELS } from './constants';
import { useFetch, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const OrdenProduccionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: orden, loading, error, refetch } = useFetch(`/costos/ordenes-produccion/${id}`);
  const { confirm, dialog, resolve } = useConfirm();

  const { mutate: iniciar, loading: iniciando } = useMutation(
    () => api.post(`/costos/ordenes-produccion/${id}/iniciar`),
    {
      onSuccess: () => { toast.success('Producción iniciada'); refetch(); },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al iniciar producción'),
    }
  );

  const { mutate: cancelar, loading: cancelando } = useMutation(
    () => api.post(`/costos/ordenes-produccion/${id}/cancelar`),
    {
      onSuccess: () => { toast.success('Orden cancelada'); refetch(); },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al cancelar la orden'),
    }
  );

  const { mutate: finalizar, loading: finalizando } = useMutation(
    (payload) => api.post(`/costos/ordenes-produccion/${id}/finalizar`, payload),
    {
      onSuccess: () => { toast.success('Orden finalizada'); refetch(); },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al finalizar la orden'),
    }
  );

  const handleCancelar = async () => {
    const ok = await confirm({
      title: 'Confirmar cancelación',
      message: '¿Está seguro que desea cancelar esta orden? Se liberará la reserva de insumos.',
    });
    if (ok) cancelar();
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ordenes-produccion')} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="page-title">Orden {orden.codigo}</div>
          <div className="page-subtitle">
            {orden.fecha_fabricacion} · {orden.responsable} ·{' '}
            <span className={`badge badge-${ESTADO_BADGE[orden.estado] || 'gray'}`}>
              {ESTADO_LABELS[orden.estado] || orden.estado}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orden.estado === 'ASIGNADA' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => iniciar()} disabled={iniciando}>
                <Play size={14} /> {iniciando ? 'Iniciando…' : 'Iniciar Producción'}
              </button>
              <button className="btn btn-secondary btn-sm text-danger" onClick={handleCancelar} disabled={cancelando}>
                <XCircle size={14} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Productos</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Producto</th><th>Cantidad Planeada</th></tr></thead>
            <tbody>
              {orden.productos.map(p => (
                <tr key={p.id}><td>{p.producto?.nombre}</td><td>{p.cantidad_planeada}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3 className="card-title">Insumos</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead>
            <tbody>
              {orden.insumos.map(i => (
                <tr key={i.id}><td>{i.insumo_nombre}</td><td>{i.cantidad}</td><td>{i.insumo_unidad_medida}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orden.estado === 'EN_PRODUCCION' && (
        <FinalizarOrdenSection orden={orden} onFinalizar={finalizar} saving={finalizando} />
      )}

      <OblejaPrint orden={orden} />

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
