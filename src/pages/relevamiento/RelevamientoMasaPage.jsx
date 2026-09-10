import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, AlertTriangle } from 'lucide-react';
import { PageLoader, ErrorState, Field } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

// La pantalla de carga por masa: una fila por rama, y arriba la única
// validación que hace evidente un gramaje mal cargado — la suma de kilos que
// consumen todas las ramas contra el lote declarado. Avisa, no bloquea: hay
// masas que legítimamente no cierran exacto.

const ROLES_SALIDA = ['SALIDA', 'COPRODUCTO'];

const numero = (valor) => (valor === '' || valor == null ? null : Number(valor));

export const RelevamientoMasaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/procesos/${id}`);
  const [ramas, setRamas] = useState(null);

  const { mutate, loading: saving } = useMutation(
    (payload) => api.put(`/costos/procesos/${id}`, payload),
    {
      onSuccess: () => { toast.success('Gramajes guardados'); navigate('/relevamiento'); },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los gramajes'),
    },
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const salidas = ramas ?? data.lineas.filter(l => ROLES_SALIDA.includes(l.rol));
  const actualizar = (indice, campo, valor) =>
    setRamas(salidas.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r)));

  // Kilos de masa que consume cada rama con lo que hay cargado. Las ramas sin
  // gramaje no suman: se cuentan aparte como pendientes.
  const consumo = salidas.reduce((total, r) => {
    const gramaje = numero(r.gramaje_g);
    if (!gramaje) return total;
    const merma = 1 - Number(r.merma_pct || 0) / 100;
    return total + (Number(r.cantidad_bollos || 0) * gramaje / 1000) / (merma || 1);
  }, 0);
  const sinGramaje = salidas.filter(r => !numero(r.gramaje_g));

  const guardar = () => {
    const porId = new Map(salidas.map(r => [r.id, r]));
    mutate({
      codigo: data.codigo, nombre: data.nombre, tipo: data.tipo, responsable: data.responsable,
      lote_referencia: data.lote_referencia, lote_unidad: data.lote_unidad,
      lote_minimo: data.lote_minimo, lote_multiplo: data.lote_multiplo,
      minutos_setup: data.minutos_setup,
      lineas: data.lineas.map((l, orden) => {
        const editada = porId.get(l.id);
        return {
          rol: l.rol, insumo_id: l.insumo_id, producto_id: l.producto_id,
          cantidad: l.cantidad, unidad: l.unidad,
          gramaje_g: editada ? numero(editada.gramaje_g) : l.gramaje_g,
          merma_pct: editada ? Number(editada.merma_pct || 0) : l.merma_pct,
          rendimiento_pct: editada ? Number(editada.rendimiento_pct ?? 100) : l.rendimiento_pct,
          minutos_directos: editada ? Number(editada.minutos_directos || 0) : l.minutos_directos,
          minutos_maquina: l.minutos_maquina,
          criterio_reparto: l.criterio_reparto || 'PESO',
          orden,
        };
      }),
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">{data.nombre}</div>
          <div className="page-subtitle">
            Lote de {data.lote_referencia} {data.lote_unidad} · {salidas.length} ramas
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={guardar} disabled={saving}>
          <Save size={14} /> {saving ? 'Guardando…' : 'Guardar gramajes'}
        </button>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 16,
          borderLeft: `3px solid ${sinGramaje.length ? 'var(--warning, #B26B15)' : 'var(--success, #1B5A44)'}`,
        }}
      >
        <div className="card-body">
          {sinGramaje.length > 0 ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={16} />
              <span>
                Faltan {sinGramaje.length} de {salidas.length} ramas: {sinGramaje.map(r => r.producto_nombre).join(', ')}
              </span>
            </div>
          ) : (
            <span>
              Las ramas consumen {consumo.toFixed(2)} {data.lote_unidad} de un lote de{' '}
              {data.lote_referencia} {data.lote_unidad}
              {Math.abs(consumo - data.lote_referencia) > 0.01 && (
                <strong>
                  {' '}— {consumo > data.lote_referencia ? 'se pasan por' : 'quedan cortas por'}{' '}
                  {Math.abs(consumo - data.lote_referencia).toFixed(2)} {data.lote_unidad}
                </strong>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Ramas de esta masa</h3></div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Bollos por lote</th>
                <th>Gramaje (g)</th>
                <th>Merma división (%)</th>
                <th>Rendimiento horno (%)</th>
                <th>Minutos de formado</th>
              </tr>
            </thead>
            <tbody>
              {salidas.map((rama, i) => (
                <tr key={rama.id}>
                  <td>{rama.producto_nombre}</td>
                  <td>
                    <input
                      type="number" step="any" className="form-input" style={{ width: 110 }}
                      value={rama.cantidad_bollos ?? ''}
                      onChange={e => actualizar(i, 'cantidad_bollos', e.target.value)}
                      placeholder="Opcional"
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any" className={`form-input ${!numero(rama.gramaje_g) ? 'error' : ''}`}
                      style={{ width: 110 }}
                      value={rama.gramaje_g ?? ''}
                      onChange={e => actualizar(i, 'gramaje_g', e.target.value)}
                      placeholder="Ej: 180"
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any" className="form-input" style={{ width: 110 }}
                      value={rama.merma_pct ?? 0}
                      onChange={e => actualizar(i, 'merma_pct', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any" className="form-input" style={{ width: 110 }}
                      value={rama.rendimiento_pct ?? 100}
                      onChange={e => actualizar(i, 'rendimiento_pct', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" className="form-input" style={{ width: 110 }}
                      value={rama.minutos_directos ?? 0}
                      onChange={e => actualizar(i, 'minutos_directos', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <Field label="" hint="«Bollos por lote» es sólo para verificar la suma: no se guarda, el sistema calcula la cantidad desde la demanda." />
        </div>
      </div>
    </div>
  );
};
