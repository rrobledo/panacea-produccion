import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { ArrowLeft, Wand2, AlertTriangle } from 'lucide-react';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import { useDebounce, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCantidadInsumo } from '../../utils/format';

// Identidad de una orden a generar. El backend agrupa por
// (producto_base_id, responsable), así que ese par identifica la orden entre
// un preview y el siguiente, aun cuando el recálculo cambie sus insumos.
const ordenKey = (orden) => `${orden.producto_base_id}|${orden.responsable}`;

const isCantidadValida = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return false;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0;
};

export const GenerarOrdenesPreviewPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const fecha = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);

  // Estructura de órdenes y líneas del primer preview (sin overrides). No se
  // reemplaza con los recálculos: si el usuario pone una línea en 0 el backend
  // deja de devolver esa orden, y sin esta copia estable la línea desaparecería
  // de la pantalla sin forma de volver atrás.
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // programacion_id -> cantidad (string, tal como viene del input)
  const [overrides, setOverrides] = useState({});
  const debouncedOverrides = useDebounce(overrides, 400);

  // Insumos del último recálculo, por ordenKey. Se refrescan contra el backend
  // porque explotar la receta necesita los Costos, que el front no tiene.
  const [insumosByKey, setInsumosByKey] = useState({});
  const [recalculando, setRecalculando] = useState(false);
  const [reintento, setReintento] = useState(0);

  const cantidadesPayload = useCallback((source) => {
    const entries = Object.entries(source).filter(([, v]) => isCantidadValida(v));
    if (entries.length === 0) return undefined;
    return entries.map(([programacion_id, cantidad]) => ({
      programacion_id: Number(programacion_id),
      cantidad: Number(cantidad),
    }));
  }, []);

  // Pide el preview y devuelve los datos, sin tocar estado. Mantenerla pura
  // deja que los efectos hagan el setState dentro del callback del .then, que
  // es el patrón que el compilador de React acepta (una llamada síncrona a una
  // función que contiene setState se marca como cascada de renders, aunque el
  // setState ocurra después del await).
  const requestPreview = useCallback(
    (source) =>
      api
        .post('/costos/ordenes-produccion/preview', { fecha, cantidades: cantidadesPayload(source) })
        .then(res => res.data),
    [fecha, cantidadesPayload]
  );

  const indexarInsumos = (data) => Object.fromEntries(data.map(o => [ordenKey(o), o.insumos]));

  // Carga inicial. `reintento` permite volver a dispararla desde el ErrorState.
  useEffect(() => {
    let cancelado = false;
    requestPreview({})
      .then(data => {
        if (cancelado) return;
        setBase(data);
        setInsumosByKey(indexarInsumos(data));
        setError(null);
      })
      .catch(e => { if (!cancelado) setError(e); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [requestPreview, reintento]);

  // Recálculo de insumos: solo después del primer preview y solo cuando el
  // usuario efectivamente tocó una cantidad.
  useEffect(() => {
    if (!base || Object.keys(debouncedOverrides).length === 0) return;
    let cancelado = false;
    requestPreview(debouncedOverrides)
      .then(data => { if (!cancelado) setInsumosByKey(indexarInsumos(data)); })
      .catch(e => { if (!cancelado) toast.error(getErrorMessage(e)); })
      .finally(() => { if (!cancelado) setRecalculando(false); });
    return () => { cancelado = true; };
    // toast se omite a propósito: no está memoizado en el provider y volvería
    // a disparar el recálculo en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOverrides, base, requestPreview]);

  const cantidadDe = (linea) => {
    const raw = overrides[linea.programacion_id];
    return raw === undefined ? linea.cantidad_planeada : raw;
  };

  const setCantidad = (programacion_id, value) => {
    setOverrides(prev => ({ ...prev, [programacion_id]: value }));
    // Se marca acá y no en el efecto: el indicador tiene que cubrir también
    // los 400 ms del debounce, no solo el request.
    setRecalculando(true);
  };

  // Total, brecha contra el lote y marca roja se calculan localmente: es
  // aritmética entera sobre datos que ya tenemos, así que responde sin latencia
  // mientras el usuario tipea. Solo los insumos esperan al backend.
  const resumen = useMemo(() => {
    if (!base) return [];
    return base.map(orden => {
      const lineas = orden.productos.map(linea => {
        const raw = cantidadDe(linea);
        const valida = isCantidadValida(raw);
        const cantidad = valida ? Number(raw) : 0;
        return {
          ...linea,
          raw,
          valida,
          cantidad,
          difiere: valida && cantidad !== linea.cantidad_programada,
        };
      });
      const activas = lineas.filter(l => l.valida && l.cantidad > 0);
      const total = activas.reduce((acc, l) => acc + l.cantidad, 0);
      return {
        orden,
        lineas,
        total,
        seGenera: activas.length > 0,
        bajoLote: total > 0 && total < orden.lote_produccion,
        diferencia: total - orden.lote_produccion,
        insumos: insumosByKey[ordenKey(orden)] || [],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, overrides, insumosByKey]);

  const hayInvalidas = resumen.some(r => r.lineas.some(l => !l.valida));
  const hayDivergentes = resumen.some(r => r.lineas.some(l => l.difiere));
  const ordenesAGenerar = resumen.filter(r => r.seGenera).length;

  const { mutate: generar, loading: generando } = useMutation(
    () => api.post('/costos/ordenes-produccion/generar', {
      fecha,
      cantidades: cantidadesPayload(overrides),
    }),
    {
      onSuccess: (res) => {
        toast.success(`${res.data.length} orden(es) de producción generada(s)`);
        navigate('/ordenes-produccion');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    }
  );

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => { setLoading(true); setError(null); setReintento(n => n + 1); }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ordenes-produccion')} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="page-title">Vista Previa de Órdenes</div>
          <div className="page-subtitle">
            Fecha de fabricación {fecha} · nada se crea hasta confirmar
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ordenes-produccion')} disabled={generando}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => generar()}
            disabled={generando || hayInvalidas || ordenesAGenerar === 0}
          >
            <Wand2 size={14} />
            {generando ? 'Generando…' : `Confirmar y Generar (${ordenesAGenerar})`}
          </button>
        </div>
      </div>

      {base.length === 0 && (
        <EmptyState
          icon={Wand2}
          title="No hay nada programado para mañana"
          description={`La Programación no tiene productos con plan para el ${fecha}, así que no hay órdenes para generar.`}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/programacion')}>
              Ir a Programación
            </button>
          }
        />
      )}

      {hayInvalidas && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          Hay cantidades inválidas. Ingresá un número entero mayor o igual a 0 para poder confirmar.
        </div>
      )}

      {hayDivergentes && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Editaste cantidades respecto de lo programado. Las órdenes se van a generar con los valores de
          esta pantalla; la Programación no se modifica.
        </div>
      )}

      {resumen.map(({ orden, lineas, total, seGenera, bajoLote, diferencia, insumos }) => (
        <div
          className="card"
          key={ordenKey(orden)}
          style={{ marginBottom: 20, opacity: seGenera ? 1 : 0.6 }}
        >
          <div className="card-header">
            <div>
              <h3 className="card-title">{orden.producto_base_nombre}</h3>
              <div className="text-sm text-gray">{orden.responsable}</div>
            </div>
            {!seGenera && <span className="badge badge-gray">No se genera</span>}
            {seGenera && bajoLote && <span className="badge badge-danger">Bajo el lote óptimo</span>}
          </div>

          <div className="card-body">
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              <Metrica label="Lote de la Fórmula" value={orden.lote_produccion.toLocaleString('es-AR')} />
              <Metrica
                label="Planificado"
                value={total.toLocaleString('es-AR')}
                danger={bajoLote}
              />
              <Metrica
                label="Diferencia"
                value={`${diferencia > 0 ? '+' : ''}${diferencia.toLocaleString('es-AR')}`}
                danger={bajoLote}
              />
              {bajoLote && (
                <div className="text-sm text-danger flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Faltan {(orden.lote_produccion - total).toLocaleString('es-AR')} para completar el lote
                </div>
              )}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ width: 140 }}>Programado</th>
                    <th style={{ width: 160 }}>Cantidad Planeada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map(linea => (
                    <tr key={linea.programacion_id}>
                      <td>{linea.producto_nombre}</td>
                      <td className="text-gray">{linea.cantidad_programada.toLocaleString('es-AR')}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className={`form-input ${linea.valida ? '' : 'error'}`}
                          style={{ width: 130 }}
                          value={linea.raw}
                          onChange={(e) => setCantidad(linea.programacion_id, e.target.value)}
                        />
                      </td>
                      <td>
                        {!linea.valida && <span className="text-sm text-danger">Entero ≥ 0</span>}
                        {linea.valida && linea.cantidad === 0 && (
                          <span className="badge badge-gray">Excluida</span>
                        )}
                        {linea.valida && linea.difiere && linea.cantidad > 0 && (
                          <span className="badge badge-warning">Difiere del plan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="divider" />

            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <strong className="text-sm">Insumos</strong>
              {recalculando && (
                <span className="text-sm text-gray flex items-center gap-2">
                  <span className="spinner" style={{ width: 12, height: 12 }} /> recalculando…
                </span>
              )}
            </div>

            {insumos.length === 0 ? (
              <div className="text-sm text-gray">
                {seGenera ? 'Esta orden no consume insumos.' : 'Sin insumos: la orden no se va a generar.'}
              </div>
            ) : (
              <div className="table-container" style={{ opacity: recalculando ? 0.5 : 1 }}>
                <table>
                  <thead><tr><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead>
                  <tbody>
                    {insumos.map(i => (
                      <tr key={i.insumo_id}>
                        <td>{i.insumo_nombre}</td>
                        <td>{formatCantidadInsumo(i.cantidad)}</td>
                        <td>{i.insumo_unidad_medida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Metrica = ({ label, value, danger }) => (
  <div>
    <div className="text-sm text-gray">{label}</div>
    <div className={`text-lg ${danger ? 'text-danger' : ''}`} style={{ fontWeight: 700 }}>{value}</div>
  </div>
);
