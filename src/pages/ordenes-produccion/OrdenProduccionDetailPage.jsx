import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, XCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { PageLoader, ErrorState, ConfirmDialog } from '../../components/ui';
import { OblejaPrint } from './OblejaPrint';
import { OrdenPrint } from './OrdenPrint';
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

  // Lo fabricado no viaja en la orden y solo existe una vez cerrada: se pide
  // aparte, con el filtro por orden, y únicamente cuando hace falta.
  const [fabricados, setFabricados] = useState([]);
  const finalizada = orden?.estado === 'FINALIZADA';
  useEffect(() => {
    if (!finalizada) return;
    let cancelado = false;
    api.get('/costos/productos_fabricados', { params: { orden_id: id } })
      .then(res => { if (!cancelado) setFabricados(res.data); })
      .catch(() => { if (!cancelado) setFabricados([]); });
    return () => { cancelado = true; };
  }, [finalizada, id]);

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

  // Solo se puede borrar lo que nunca llegó a producirse: EN_PRODUCCION ya
  // consumió insumos y FINALIZADA tiene productos fabricados apuntándola.
  const sePuedeBorrar = orden?.estado === 'ASIGNADA' || orden?.estado === 'CANCELADA';

  const { mutate: borrar, loading: borrando } = useMutation(
    () => api.delete(`/costos/ordenes-produccion/${id}`),
    {
      onSuccess: () => {
        toast.success('Orden eliminada');
        navigate('/ordenes-produccion');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    }
  );

  const handleBorrar = async () => {
    const ok = await confirm({
      title: `Borrar la orden ${orden.codigo}`,
      message: `Se va a eliminar la orden ${orden.codigo} junto con sus líneas y la reserva de insumos. Esta acción no se puede deshacer.`,
    });
    if (ok) borrar();
  };

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
          {sePuedeBorrar && (
            <button className="btn btn-secondary btn-sm text-danger" onClick={handleBorrar} disabled={borrando}>
              <Trash2 size={14} /> {borrando ? 'Borrando…' : 'Borrar'}
            </button>
          )}
        </div>
      </div>

      {orden.estado === 'EN_PRODUCCION' && (
        <FinalizarOrdenSection orden={orden} onFinalizar={finalizar} saving={finalizando} />
      )}

      <OrdenPrint orden={orden} fabricados={fabricados} />

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
