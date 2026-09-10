import { Plus, Trash2 } from 'lucide-react';
import { Field } from '../../components/ui';
import { TIPOS_MAQUINA } from '../maquinaria/constants';

// Las etapas por las que pasa el proceso. Cada una apunta a un TIPO de máquina
// y a una capacidad mínima, nunca a una máquina concreta: si la receta dijera
// "Amasadora #2", cada mantenimiento obligaría a editarla y se perdería la
// posibilidad de reacomodar el día. Ver design.md D10.

const OPERACION_VACIA = {
  nombre: '', maquina_tipo: 'AMASADORA', capacidad_minima: '',
  minutos_por_bacha: 0, minutos_por_unidad: 0, requiere_operario: true, puede_solapar: false,
};

export const ProcesoOperacionesEditor = ({ operaciones, onChange, disabled }) => {
  const agregar = () => onChange([...operaciones, { ...OPERACION_VACIA }]);
  const quitar = (i) => onChange(operaciones.filter((_, indice) => indice !== i));
  const actualizar = (i, campo, valor) =>
    onChange(operaciones.map((o, indice) => (indice === i ? { ...o, [campo]: valor } : o)));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header flex items-center justify-between">
        <h3 className="card-title">Recorrido de máquinas</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={agregar} disabled={disabled}>
          <Plus size={14} /> Agregar etapa
        </button>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        {operaciones.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', margin: 0 }}>
            Sin etapas cargadas. Sin ellas la orden no puede decir qué máquinas necesita ni entra en
            el tablero de carga del día.
          </p>
        ) : (
          <table className="table" style={{ width: '100%', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Etapa</th>
                <th>Tipo de máquina</th>
                <th style={{ textAlign: 'right' }}>Capacidad mínima</th>
                <th style={{ textAlign: 'right' }}>Min. por bacha</th>
                <th style={{ textAlign: 'right' }}>Min. por unidad</th>
                <th>Operario</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {operaciones.map((o, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      className="form-input" style={{ minWidth: 140 }} value={o.nombre}
                      onChange={e => actualizar(i, 'nombre', e.target.value)} placeholder="Amasado"
                    />
                  </td>
                  <td>
                    <select
                      className="form-select" style={{ minWidth: 150 }} value={o.maquina_tipo}
                      onChange={e => actualizar(i, 'maquina_tipo', e.target.value)}
                    >
                      {TIPOS_MAQUINA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number" step="any" className="form-input" style={{ width: 110 }}
                      value={o.capacidad_minima ?? ''}
                      onChange={e => actualizar(i, 'capacidad_minima', e.target.value)}
                      placeholder="Cualquiera"
                    />
                  </td>
                  <td>
                    <input
                      type="number" className="form-input" style={{ width: 100 }}
                      value={o.minutos_por_bacha ?? 0}
                      onChange={e => actualizar(i, 'minutos_por_bacha', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any" className="form-input" style={{ width: 100 }}
                      value={o.minutos_por_unidad ?? 0}
                      onChange={e => actualizar(i, 'minutos_por_unidad', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox" checked={!!o.requiere_operario}
                      onChange={e => actualizar(i, 'requiere_operario', e.target.checked)}
                    />
                  </td>
                  <td>
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
      <div className="card-footer">
        <Field label="" hint="Destildar «Operario» en la fermentación: la cámara ocupa máquina pero no consume mano de obra." />
      </div>
    </div>
  );
};
