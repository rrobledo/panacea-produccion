import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, Modal } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { ROLES_LINEA, ROLES_SALIDA, rolLabel } from './constants';

// El editor de las aristas del grafo. Cada línea apunta a un artículo — un
// insumo o un producto — y ahí es donde vive el gramaje.
//
// El picker de producto NO filtra por `is_producto`: que un artículo pueda ser
// terminado y a la vez componente de otro es justamente el caso que el modelo
// viejo no podía expresar (caso del brownie). Ver
// openspec/changes/masa-procesos-y-maquinaria/specs/procesos/spec.md.

const LINEA_VACIA = {
  rol: 'ENTRADA', insumo_id: null, producto_id: null, cantidad: '', unidad: '',
  gramaje_g: '', merma_pct: 0, rendimiento_pct: 100, minutos_directos: 0, minutos_maquina: 0,
};

const numeroOVacio = (valor) => (valor === '' || valor === null || valor === undefined ? null : Number(valor));

export const ProcesoLineasEditor = ({ lineas, onChange, disabled }) => {
  const [modal, setModal] = useState(null);   // { indice, linea }

  const abrirNueva = () => setModal({ indice: null, linea: { ...LINEA_VACIA } });
  const abrirEdicion = (indice) => setModal({ indice, linea: { ...lineas[indice] } });

  const guardar = () => {
    const { indice, linea } = modal;
    const normalizada = {
      ...linea,
      cantidad: Number(linea.cantidad || 0),
      gramaje_g: numeroOVacio(linea.gramaje_g),
      merma_pct: Number(linea.merma_pct || 0),
      rendimiento_pct: Number(linea.rendimiento_pct ?? 100),
      minutos_directos: Number(linea.minutos_directos || 0),
      minutos_maquina: Number(linea.minutos_maquina || 0),
    };
    onChange(indice === null ? [...lineas, normalizada] : lineas.map((l, i) => (i === indice ? normalizada : l)));
    setModal(null);
  };

  const quitar = (indice) => onChange(lineas.filter((_, i) => i !== indice));

  const actualizar = (campo, valor) => setModal(m => ({ ...m, linea: { ...m.linea, [campo]: valor } }));

  const linea = modal?.linea;
  const esSalida = linea && ROLES_SALIDA.includes(linea.rol);
  const apuntaAProducto = linea?.producto_id != null;
  const puedeGuardar = linea
    && (linea.insumo_id != null) !== (linea.producto_id != null)
    && linea.cantidad !== '';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="card-title">Líneas del proceso</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={abrirNueva} disabled={disabled}>
          <Plus size={14} /> Agregar línea
        </button>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        {lineas.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', margin: 0 }}>
            Todavía no hay líneas. Un proceso necesita al menos una salida para poder programarse.
          </p>
        ) : (
          <table className="table" style={{ width: '100%', minWidth: 720 }}>
            <thead>
              <tr>
                <th>Rol</th>
                <th>Artículo</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Gramaje</th>
                <th style={{ textAlign: 'right' }}>Merma</th>
                <th style={{ textAlign: 'right' }}>Rendimiento</th>
                <th style={{ textAlign: 'right' }}>Min. directos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td>{rolLabel(l.rol)}</td>
                  <td>{l.insumo_nombre || l.producto_nombre || (l.insumo_id ? `Insumo ${l.insumo_id}` : `Producto ${l.producto_id}`)}</td>
                  <td style={{ textAlign: 'right' }}>{l.cantidad} {l.unidad || ''}</td>
                  <td style={{ textAlign: 'right' }}>{l.gramaje_g ? `${l.gramaje_g} g` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{l.merma_pct ? `${l.merma_pct} %` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{l.rendimiento_pct ?? 100} %</td>
                  <td style={{ textAlign: 'right' }}>{l.minutos_directos || 0}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => abrirEdicion(i)} disabled={disabled}>Editar</button>
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => quitar(i)} disabled={disabled}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.indice === null ? 'Nueva línea' : 'Editar línea'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={guardar} disabled={!puedeGuardar}>Guardar</button>
          </>
        }
      >
        {linea && (
          <div className="form-row">
            <Field label="Rol" required size="sm">
              <select
                className="form-select" value={linea.rol}
                onChange={e => actualizar('rol', e.target.value)}
              >
                {ROLES_LINEA.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>

            <Field
              label="Insumo"
              hint={apuntaAProducto ? 'Ya hay un producto elegido' : 'Una línea apunta a un insumo o a un producto, no a los dos'}
              size="md"
            >
              <EntityPicker
                value={linea.insumo_id}
                onChange={(id) => setModal(m => ({ ...m, linea: { ...m.linea, insumo_id: id, producto_id: null } }))}
                resource="/costos/insumos"
                labelField="nombre"
                disabled={apuntaAProducto}
              />
            </Field>

            <Field label="Producto" size="md">
              <EntityPicker
                value={linea.producto_id}
                onChange={(id) => setModal(m => ({ ...m, linea: { ...m.linea, producto_id: id, insumo_id: null } }))}
                resource="/costos/productos"
                labelField="nombre"
                disabled={linea.insumo_id != null}
              />
            </Field>

            <Field label="Cantidad" required hint="Por lote de referencia del proceso" size="sm">
              <input
                type="number" step="any" className="form-input" value={linea.cantidad}
                onChange={e => actualizar('cantidad', e.target.value)}
              />
            </Field>

            <Field label="Unidad" size="xs">
              <input className="form-input" value={linea.unidad || ''} onChange={e => actualizar('unidad', e.target.value)} placeholder="KG" />
            </Field>

            {esSalida && (
              <Field
                label="Gramaje (g)" size="sm"
                hint="Peso del bollo crudo. Necesario si la salida se cuenta por unidad."
              >
                <input
                  type="number" step="any" className="form-input" value={linea.gramaje_g ?? ''}
                  onChange={e => actualizar('gramaje_g', e.target.value)}
                />
              </Field>
            )}

            <Field label="Merma (%)" hint="Lo que se pierde al partir o cortar" size="xs">
              <input
                type="number" step="any" className="form-input" value={linea.merma_pct ?? 0}
                onChange={e => actualizar('merma_pct', e.target.value)}
              />
            </Field>

            <Field label="Rendimiento (%)" hint="Lo que sobrevive al horno" size="xs">
              <input
                type="number" step="any" className="form-input" value={linea.rendimiento_pct ?? 100}
                onChange={e => actualizar('rendimiento_pct', e.target.value)}
              />
            </Field>

            <Field label="Minutos directos" hint="Mano de obra sólo de esta rama" size="xs">
              <input
                type="number" className="form-input" value={linea.minutos_directos ?? 0}
                onChange={e => actualizar('minutos_directos', e.target.value)}
              />
            </Field>

            <Field label="Minutos máquina" hint="Horno, sobadora, batidora" size="xs">
              <input
                type="number" className="form-input" value={linea.minutos_maquina ?? 0}
                onChange={e => actualizar('minutos_maquina', e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
};
