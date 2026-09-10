import { ESTADO_LABELS } from './constants';
import { formatCantidadInsumo } from '../../utils/format';

// Orden de trabajo completa, para la carpeta de producción. A diferencia de la
// oblea —que se pega en bandejas y carros a la vista de cualquiera, y por eso
// omite los insumos a propósito— este documento sí lleva la receta explotada.
//
// NO se muestra en pantalla: repetía los productos y los insumos que el detalle
// ya lista. Se renderiza en un contenedor de alto 0 con overflow oculto, porque
// react-to-print clona este nodo para imprimirlo y necesita que exista en el
// DOM con sus estilos calculados — con `display: none` el clon puede salir
// vacío. El disparo vive en el detalle, que es quien tiene el botón.

const fmtFechaHora = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('es-AR');
};

const Bloque = ({ titulo, children }) => (
  <div style={{ marginTop: 20 }}>
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--gray-500)', borderBottom: '1px solid var(--gray-300)', paddingBottom: 4, marginBottom: 8,
    }}>
      {titulo}
    </div>
    {children}
  </div>
);

const Dato = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
      {label}
    </div>
    <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
  </div>
);

const th = {
  padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-600)',
  borderBottom: '2px solid var(--gray-300)',
};
const td = { padding: '6px 10px', borderBottom: '1px solid var(--gray-200)', fontSize: 12 };
const tabla = { width: '100%', borderCollapse: 'collapse' };

export const OrdenPrintDocument = ({ orden, fabricados = [], contentRef }) => {
  const fechas = [
    ['Creación', fmtFechaHora(orden.fecha_creacion)],
    ['En Producción', fmtFechaHora(orden.fecha_en_produccion)],
    ['Finalizada', fmtFechaHora(orden.fecha_finalizada)],
    ['Cancelada', fmtFechaHora(orden.fecha_cancelada)],
  ].filter(([, v]) => v);

  const conDesperdicio = fabricados.filter(f => Number(f.cantidad_desperdicio) > 0);

  // Las órdenes emitidas por el motor viejo no tienen proceso: en esas la orden
  // se imprime como siempre, con un solo bloque de productos.
  const porGrafo = orden.proceso_id != null;
  const operaciones = orden.operaciones || [];
  const sobrante = Number(orden.lote_producido || 0)
    - (Number(orden.masa_requerida || 0) - Number(orden.masa_desde_stock || 0));

  return (
    <div aria-hidden="true" style={{ height: 0, overflow: 'hidden' }}>
      <div>
        <div ref={contentRef} style={{ background: 'white', padding: 8, width: 794 }}>
          <style>{`@media print { @page { size: A4 portrait; margin: 15mm; } body { font-family: Arial, sans-serif; } }`}</style>

          {/* Encabezado */}
          <div style={{ borderBottom: '2px solid var(--gray-900)', paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-500)' }}>
                  Orden de Producción
                </div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{orden.codigo}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--gray-500)' }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Panacea Producción</div>
                <div>Impreso: {new Date().toLocaleString('es-AR')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 12 }}>
              <Dato label="Fecha de Fabricación" value={orden.fecha_fabricacion} />
              <Dato label="Responsable / Área" value={orden.responsable} />
              <Dato label="Estado" value={ESTADO_LABELS[orden.estado] || orden.estado} />
            </div>
          </div>

          {porGrafo && (
            <Bloque titulo="Masa — cuánto amasar">
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                <Dato label="Requerido por las ramas" value={`${orden.masa_requerida} kg`} />
                <Dato label="Lote a producir" value={`${orden.lote_producido} kg`} />
                {Number(orden.masa_desde_stock) > 0 && (
                  <Dato label="Sale de stock" value={`${orden.masa_desde_stock} kg`} />
                )}
                {sobrante > 0 && <Dato label="Sobrante" value={`${sobrante.toFixed(2)} kg`} />}
              </div>
            </Bloque>
          )}

          {fechas.length > 0 && (
            <Bloque titulo="Fechas">
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                {fechas.map(([label, value]) => <Dato key={label} label={label} value={value} />)}
              </div>
            </Bloque>
          )}

          {/* Bloque B · Partición: qué sacar de la masa. Las columnas de masa,
              gramaje y bollos sólo las llenan las órdenes emitidas por el motor
              del grafo; las viejas muestran sólo la cantidad planeada. */}
          <Bloque titulo={porGrafo ? 'Partición — qué sacar de esa masa' : 'Productos'}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Producto</th>
                  {porGrafo && <th style={{ ...th, width: 90 }}>Masa</th>}
                  {porGrafo && <th style={{ ...th, width: 90 }}>Gramaje</th>}
                  {porGrafo && <th style={{ ...th, width: 80 }}>Bollos</th>}
                  <th style={{ ...th, width: 140 }}>Cantidad Planeada</th>
                </tr>
              </thead>
              <tbody>
                {orden.productos.map(p => (
                  <tr key={p.id}>
                    <td style={td}>{p.producto?.nombre}</td>
                    {porGrafo && <td style={td}>{p.masa_kg != null ? `${p.masa_kg} kg` : '—'}</td>}
                    {porGrafo && <td style={td}>{p.gramaje_g != null ? `${p.gramaje_g} g` : '—'}</td>}
                    {porGrafo && <td style={td}>{p.bollos != null ? Number(p.bollos).toLocaleString('es-AR') : '—'}</td>}
                    <td style={td}>{Number(p.cantidad_planeada).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloque>

          {operaciones.length > 0 && (
            <Bloque titulo="Recorrido de máquinas">
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Etapa</th>
                    <th style={th}>Máquina</th>
                    <th style={{ ...th, width: 70 }}>Bachas</th>
                    <th style={{ ...th, width: 90 }}>Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {operaciones.map(o => (
                    <tr key={o.id}>
                      <td style={td}>{o.nombre}</td>
                      <td style={td}>
                        {o.maquina_nombre || `${o.maquina_tipo} — sin asignar`}
                        {!o.requiere_operario && ' · sin operario'}
                      </td>
                      <td style={td}>{o.bachas}</td>
                      <td style={td}>{o.minutos} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Bloque>
          )}

          <Bloque titulo={porGrafo ? 'Fórmula de la masa — insumos a retirar' : 'Insumos'}>
            {orden.insumos.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Esta orden no consume insumos.</div>
            ) : (
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Insumo</th>
                    <th style={{ ...th, width: 120 }}>Cantidad</th>
                    <th style={{ ...th, width: 100 }}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {orden.insumos.map(i => (
                    <tr key={i.id}>
                      <td style={td}>{i.insumo_nombre}</td>
                      <td style={td}>{formatCantidadInsumo(i.cantidad)}</td>
                      <td style={td}>{i.insumo_unidad_medida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloque>

          {/* Solo tiene sentido en una orden cerrada */}
          {orden.estado === 'FINALIZADA' && (
            <>
              <Bloque titulo="Producto Fabricado">
                {fabricados.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Sin registro de fabricación.</div>
                ) : (
                  <table style={tabla}>
                    <thead>
                      <tr>
                        <th style={th}>Producto</th>
                        <th style={{ ...th, width: 140 }}>Cantidad Fabricada</th>
                        <th style={{ ...th, width: 200 }}>Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fabricados.map(f => (
                        <tr key={f.id}>
                          <td style={td}>{f.producto?.nombre}</td>
                          <td style={td}>{Number(f.cantidad_fabricada).toLocaleString('es-AR')}</td>
                          <td style={td}>{f.ubicacion?.nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Bloque>

              {conDesperdicio.length > 0 && (
                <Bloque titulo="Desperdicio">
                  <table style={tabla}>
                    <thead>
                      <tr>
                        <th style={th}>Producto</th>
                        <th style={{ ...th, width: 110 }}>Cantidad</th>
                        <th style={{ ...th, width: 180 }}>Ubicación</th>
                        <th style={th}>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conDesperdicio.map(f => (
                        <tr key={f.id}>
                          <td style={td}>{f.producto?.nombre}</td>
                          <td style={td}>{Number(f.cantidad_desperdicio).toLocaleString('es-AR')}</td>
                          <td style={td}>{f.ubicacion_desperdicio?.nombre || '—'}</td>
                          <td style={td}>{f.motivo_desperdicio || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Bloque>
              )}
            </>
          )}

          <div style={{
            marginTop: 32, paddingTop: 10, borderTop: '1px solid var(--gray-200)',
            fontSize: 10, color: 'var(--gray-400)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Orden de Producción {orden.codigo}</span>
            <span>Panacea Producción</span>
          </div>
        </div>
      </div>
    </div>
  );
};
