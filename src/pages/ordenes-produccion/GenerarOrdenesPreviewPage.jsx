import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { ArrowLeft, Wand2, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
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

const toggleEnSet = (set, key) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
};

const num = (n) => n.toLocaleString('es-AR');

export const GenerarOrdenesPreviewPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const hoy = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const manana = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);

  // La fecha vive en la URL para que sobreviva a un refresh y se pueda
  // compartir el enlace. Por defecto mañana, que es el caso habitual. No se
  // permite generar hacia atrás: un valor anterior a hoy en el query param
  // cae de vuelta a mañana.
  const fechaParam = searchParams.get('fecha');
  const fecha = fechaParam && fechaParam >= hoy ? fechaParam : manana;

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

  // Se guardan las DESELECCIONADAS y no las seleccionadas: así "todas
  // marcadas" es el conjunto vacío y una orden que aparezca en un recálculo
  // entra seleccionada sin lógica extra.
  const [deseleccionadas, setDeseleccionadas] = useState(() => new Set());
  const [expandidas, setExpandidas] = useState(() => new Set());

  // Insumos del último recálculo, por ordenKey. Se refrescan contra el backend
  // porque explotar la receta necesita los Costos, que el front no tiene.
  const [insumosByKey, setInsumosByKey] = useState({});
  const [recalculando, setRecalculando] = useState(false);
  const [reintento, setReintento] = useState(0);

  // Solo las cantidades editadas. Los ceros que representan una orden
  // deseleccionada NO van acá: si se mandaran al preview, el backend dejaría
  // de devolver esa orden y perderíamos sus insumos y su fila.
  const cantidadesEditadas = useCallback((source) => {
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
        .post('/costos/ordenes-produccion/preview', { fecha, cantidades: cantidadesEditadas(source) })
        .then(res => res.data),
    [fecha, cantidadesEditadas]
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

  const cambiarFecha = (nueva) => {
    if (!nueva || nueva < hoy || nueva === fecha) return;
    // Todo lo editado apunta a filas de Programación de la fecha anterior:
    // no tiene sentido arrastrarlo al nuevo día.
    setOverrides({});
    setDeseleccionadas(new Set());
    setExpandidas(new Set());
    setInsumosByKey({});
    setRecalculando(false);
    setError(null);
    setLoading(true);
    setSearchParams({ fecha: nueva }, { replace: true });
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
      const key = ordenKey(orden);
      const lineas = orden.productos.map(linea => {
        const raw = overrides[linea.programacion_id] ?? linea.cantidad_planeada;
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
      const seleccionada = !deseleccionadas.has(key);
      return {
        key,
        orden,
        lineas,
        total,
        seleccionada,
        expandida: expandidas.has(key),
        tieneLineas: activas.length > 0,
        seGenera: seleccionada && activas.length > 0,
        bajoLote: total > 0 && total < orden.lote_produccion,
        diferencia: total - orden.lote_produccion,
        insumos: insumosByKey[key] || [],
      };
    });
  }, [base, overrides, insumosByKey, deseleccionadas, expandidas]);

  // Una cantidad inválida en una orden descartada no traba la confirmación:
  // esa orden no se va a crear.
  const hayInvalidas = resumen.some(r => r.seleccionada && r.lineas.some(l => !l.valida));
  const hayDivergentes = resumen.some(r => r.seleccionada && r.lineas.some(l => l.difiere));
  const aGenerar = resumen.filter(r => r.seGenera).length;
  const todasSeleccionadas = resumen.length > 0 && resumen.every(r => r.seleccionada);
  const ningunaSeleccionada = resumen.length > 0 && resumen.every(r => !r.seleccionada);

  const toggleTodas = () => {
    setDeseleccionadas(todasSeleccionadas ? new Set(resumen.map(r => r.key)) : new Set());
  };

  const { mutate: generar, loading: generando } = useMutation(
    () => {
      // Las órdenes deseleccionadas viajan con todas sus líneas en 0, que el
      // backend ya interpreta como "excluir la línea", descartando el grupo
      // que queda sin ninguna. Solo acá, nunca en el preview.
      const ceros = {};
      for (const r of resumen) {
        if (r.seleccionada) continue;
        for (const l of r.lineas) ceros[l.programacion_id] = 0;
      }
      return api.post('/costos/ordenes-produccion/generar', {
        fecha,
        cantidades: cantidadesEditadas({ ...overrides, ...ceros }),
      });
    },
    {
      onSuccess: (res) => {
        toast.success(`${res.data.length} orden(es) de producción generada(s)`);
        navigate('/ordenes-produccion');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    }
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ordenes-produccion')} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="page-title">Vista Previa de Órdenes</div>
          <div className="page-subtitle flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <label htmlFor="fecha-fabricacion">Fecha de fabricación</label>
            <input
              id="fecha-fabricacion"
              type="date"
              className="form-input"
              style={{ width: 170 }}
              value={fecha}
              min={hoy}
              onChange={(e) => cambiarFecha(e.target.value)}
            />
            {fecha === hoy && <span className="badge badge-gray">Hoy</span>}
            {fecha === manana && <span className="badge badge-gray">Mañana</span>}
            <span>· nada se crea hasta confirmar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ordenes-produccion')} disabled={generando}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => generar()}
            disabled={generando || loading || !!error || hayInvalidas || aGenerar === 0}
          >
            <Wand2 size={14} />
            {generando ? 'Generando…' : `Confirmar y Generar (${aGenerar})`}
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => { setLoading(true); setError(null); setReintento(n => n + 1); }}
        />
      ) : !base || base.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="No hay nada programado para esa fecha"
          description={`La Programación no tiene productos con plan para el ${fecha}, así que no hay órdenes para generar. Probá con otra fecha.`}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/programacion')}>
              Ir a Programación
            </button>
          }
        />
      ) : (
        <>
          {hayInvalidas && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              Hay cantidades inválidas en órdenes seleccionadas. Ingresá un número entero mayor o igual a 0 para poder confirmar.
            </div>
          )}

          {ningunaSeleccionada && (
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              No hay ninguna orden seleccionada. Marcá al menos una para poder generar.
            </div>
          )}

          {hayDivergentes && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              Editaste cantidades respecto de lo programado. Las órdenes se van a generar con los valores de
              esta pantalla; la Programación no se modifica.
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Órdenes a generar</h3>
              {recalculando && (
                <span className="text-sm text-gray flex items-center gap-2">
                  <span className="spinner" style={{ width: 12, height: 12 }} /> recalculando insumos…
                </span>
              )}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas"
                        checked={todasSeleccionadas}
                        ref={(el) => { if (el) el.indeterminate = !todasSeleccionadas && !ningunaSeleccionada; }}
                        onChange={toggleTodas}
                      />
                    </th>
                    <th style={{ width: 36 }}></th>
                    <th>Orden / Producto</th>
                    <th style={{ width: 110 }}>Lote Fórmula</th>
                    <th style={{ width: 110 }}>Programado</th>
                    <th style={{ width: 150 }}>Cantidad</th>
                    <th style={{ width: 110 }}>Diferencia</th>
                    <th style={{ width: 200 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map(r => (
                    <Fragment key={r.key}>
                      {/* ── Encabezado de la orden ── */}
                      <tr style={{ background: 'var(--gray-50)', opacity: r.seleccionada ? 1 : 0.5 }}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Generar ${r.orden.producto_base_nombre} · ${r.orden.responsable}`}
                            checked={r.seleccionada}
                            onChange={() => setDeseleccionadas(prev => toggleEnSet(prev, r.key))}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-label={r.expandida ? 'Ocultar insumos' : 'Ver insumos'}
                            aria-expanded={r.expandida}
                            style={{ padding: 4 }}
                            onClick={() => setExpandidas(prev => toggleEnSet(prev, r.key))}
                          >
                            {r.expandida ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r.orden.producto_base_nombre}</div>
                          <div className="text-sm text-gray">{r.orden.responsable}</div>
                        </td>
                        <td>{num(r.orden.lote_produccion)}</td>
                        <td></td>
                        <td className={r.bajoLote ? 'text-danger' : ''} style={{ fontWeight: 700 }}>
                          {num(r.total)}
                        </td>
                        <td className={r.bajoLote ? 'text-danger' : ''} style={{ fontWeight: 700 }}>
                          {r.diferencia > 0 ? '+' : ''}{num(r.diferencia)}
                        </td>
                        <td>
                          {!r.seleccionada && <span className="badge badge-gray">No se genera</span>}
                          {r.seleccionada && !r.tieneLineas && <span className="badge badge-gray">Sin líneas</span>}
                          {r.seleccionada && r.tieneLineas && r.bajoLote && (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Faltan {num(r.orden.lote_produccion - r.total)} para el lote
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* ── Una fila por producto, con la cantidad editable ── */}
                      {r.lineas.map(linea => (
                        <tr key={linea.programacion_id} style={{ opacity: r.seleccionada ? 1 : 0.5 }}>
                          <td></td>
                          <td></td>
                          <td style={{ paddingLeft: 28 }}>{linea.producto_nombre}</td>
                          <td></td>
                          <td className="text-gray">{num(linea.cantidad_programada)}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={`form-input ${linea.valida ? '' : 'error'}`}
                              style={{ width: 120 }}
                              value={linea.raw}
                              onChange={(e) => setCantidad(linea.programacion_id, e.target.value)}
                            />
                          </td>
                          <td></td>
                          <td>
                            {!linea.valida && <span className="text-sm text-danger">Entero ≥ 0</span>}
                            {linea.valida && linea.cantidad === 0 && <span className="badge badge-gray">Excluida</span>}
                            {linea.valida && linea.difiere && linea.cantidad > 0 && (
                              <span className="badge badge-warning">Difiere del plan</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* ── Detalle desplegable: insumos de esta orden ── */}
                      {r.expandida && (
                        <tr style={{ opacity: r.seleccionada ? 1 : 0.5 }}>
                          <td></td>
                          <td></td>
                          <td colSpan={6} style={{ paddingLeft: 28, paddingBottom: 16 }}>
                            <div className="text-sm text-gray" style={{ marginBottom: 6, fontWeight: 600 }}>
                              Insumos
                            </div>
                            {r.insumos.length === 0 ? (
                              <div className="text-sm text-gray">
                                {r.tieneLineas ? 'Esta orden no consume insumos.' : 'Sin insumos: la orden no se va a generar.'}
                              </div>
                            ) : (
                              <table style={{ opacity: recalculando ? 0.5 : 1, maxWidth: 560 }}>
                                <thead><tr><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead>
                                <tbody>
                                  {r.insumos.map(i => (
                                    <tr key={i.insumo_id}>
                                      <td>{i.insumo_nombre}</td>
                                      <td>{formatCantidadInsumo(i.cantidad)}</td>
                                      <td>{i.insumo_unidad_medida}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
