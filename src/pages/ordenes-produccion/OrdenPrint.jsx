import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { ESTADO_LABELS } from './constants';
import { formatCantidadInsumo } from '../../utils/format';

// Orden de trabajo completa, para la carpeta de producción. A diferencia de la
// oblea —que se pega en bandejas y carros a la vista de cualquiera, y por eso
// omite los insumos a propósito— este documento sí lleva la receta explotada.
// Son dos impresos con formato y audiencia distintos, de ahí que sean dos
// componentes separados y dos acciones separadas en el detalle.

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

export const OrdenPrint = ({ orden, fabricados = [] }) => {
  const contentRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef, documentTitle: `Orden-${orden.codigo}` });

  const fechas = [
    ['Creación', fmtFechaHora(orden.fecha_creacion)],
    ['En Producción', fmtFechaHora(orden.fecha_en_produccion)],
    ['Finalizada', fmtFechaHora(orden.fecha_finalizada)],
    ['Cancelada', fmtFechaHora(orden.fecha_cancelada)],
  ].filter(([, v]) => v);

  const conDesperdicio = fabricados.filter(f => Number(f.cantidad_desperdicio) > 0);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      {/* Sin título: es el único bloque de contenido del detalle, así que el
          encabezado solo lleva la acción. `card-header` reparte con
          space-between, de ahí el flex-end para que el botón quede a la derecha. */}
      <div className="card-header" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm no-print" onClick={handlePrint}>
          <Printer size={14} /> Imprimir Orden
        </button>
      </div>
      <div className="card-body">
        <div ref={contentRef} style={{ background: 'white', padding: 8 }}>
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

          {fechas.length > 0 && (
            <Bloque titulo="Fechas">
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                {fechas.map(([label, value]) => <Dato key={label} label={label} value={value} />)}
              </div>
            </Bloque>
          )}

          <Bloque titulo="Productos">
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Producto</th>
                  <th style={{ ...th, width: 160 }}>Cantidad Planeada</th>
                </tr>
              </thead>
              <tbody>
                {orden.productos.map(p => (
                  <tr key={p.id}>
                    <td style={td}>{p.producto?.nombre}</td>
                    <td style={td}>{Number(p.cantidad_planeada).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloque>

          <Bloque titulo="Insumos">
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
