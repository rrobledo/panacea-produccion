import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Play, XCircle, ArrowLeft, Trash2, Printer } from 'lucide-react';
import { PageLoader, ErrorState, ConfirmDialog, Select } from '../../components/ui';
import { OblejaPrint } from './OblejaPrint';
import { OrdenPrintDocument } from './OrdenPrint';
import { FinalizarOrdenSection } from './FinalizarOrdenSection';
import { ESTADO_BADGE, ESTADO_LABELS } from './constants';
import { RESPONSABLES } from '../programacion/constants';
import { useFetch, useMutation, useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCantidadInsumo } from '../../utils/format';

export const OrdenProduccionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: orden, loading, error, refetch } = useFetch(`/costos/ordenes-produccion/${id}`);
  const { confirm, dialog, resolve } = useConfirm();

  const printRef = useRef(null);
  const imprimirOrden = useReactToPrint({ contentRef: printRef, documentTitle: `Orden-${orden?.codigo}` });

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

  // El responsable es a quién se le asigna el trabajo: cambiarlo tiene sentido
  // mientras la orden sigue viva, no una vez cerrada.
  const sePuedeReasignar = orden?.estado === 'ASIGNADA' || orden?.estado === 'EN_PRODUCCION';

  const { mutate: reasignar, loading: reasignando } = useMutation(
    (responsable) => api.patch(`/costos/ordenes-produccion/${id}`, { responsable }),
    {
      onSuccess: () => { toast.success('Responsable actualizado'); refetch(); },
      onError: (e) => toast.error(getErrorMessage(e)),
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
          <div className="page-subtitle flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span>{orden.fecha_fabricacion}</span>
            <span>·</span>
            {sePuedeReasignar ? (
              <Select
                options={RESPONSABLES.filter(r => r.value)}
                value={orden.responsable}
                onChange={(v) => { if (v && v !== orden.responsable) reasignar(v); }}
                placeholder="Responsable"
                style={{ width: 170 }}
                disabled={reasignando}
              />
            ) : (
              <span>{orden.responsable}</span>
            )}
            <span>·</span>
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
          <button className="btn btn-secondary btn-sm" onClick={imprimirOrden}>
            <Printer size={14} /> Imprimir Orden
          </button>
          {sePuedeBorrar && (
            <button className="btn btn-secondary btn-sm text-danger" onClick={handleBorrar} disabled={borrando}>
              <Trash2 size={14} /> {borrando ? 'Borrando…' : 'Borrar'}
            </button>
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
                <tr key={i.id}><td>{i.insumo_nombre}</td><td>{formatCantidadInsumo(i.cantidad)}</td><td>{i.insumo_unidad_medida}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orden.estado === 'EN_PRODUCCION' && (
        <FinalizarOrdenSection orden={orden} onFinalizar={finalizar} saving={finalizando} />
      )}

      {/* Fuera de pantalla: solo existe para que react-to-print lo clone. */}
      <OrdenPrintDocument orden={orden} fabricados={fabricados} contentRef={printRef} />

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
