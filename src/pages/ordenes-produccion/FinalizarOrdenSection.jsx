import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { EntityPicker } from '../../components/form/EntityPicker';
import { Field } from '../../components/ui';

const initLineas = (productos) => productos.map(p => ({
  producto_id: p.producto_id,
  producto_nombre: p.producto?.nombre,
  cantidad_fabricada: p.cantidad_planeada,
  ubicacion_id: null,
  cantidad_desperdicio: 0,
  ubicacion_desperdicio_id: null,
  motivo_desperdicio: '',
}));

export const FinalizarOrdenSection = ({ orden, onFinalizar, saving }) => {
  const [lineas, setLineas] = useState(() => initLineas(orden.productos));

  const updateLinea = (producto_id, patch) => {
    setLineas(prev => prev.map(l => l.producto_id === producto_id ? { ...l, ...patch } : l));
  };

  const isValid = lineas.every(l =>
    l.cantidad_fabricada !== '' && l.cantidad_fabricada != null &&
    l.ubicacion_id != null &&
    (Number(l.cantidad_desperdicio) <= 0 || (l.ubicacion_desperdicio_id != null && l.motivo_desperdicio))
  );

  const handleSubmit = () => {
    onFinalizar({
      lineas: lineas.map(l => ({
        producto_id: l.producto_id,
        cantidad_fabricada: Number(l.cantidad_fabricada),
        ubicacion_id: l.ubicacion_id,
        cantidad_desperdicio: Number(l.cantidad_desperdicio) || 0,
        ubicacion_desperdicio_id: Number(l.cantidad_desperdicio) > 0 ? l.ubicacion_desperdicio_id : null,
        motivo_desperdicio: Number(l.cantidad_desperdicio) > 0 ? l.motivo_desperdicio : null,
      })),
    });
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header"><h3 className="card-title">Finalizar Orden</h3></div>
      <div className="card-body">
        {lineas.map(linea => (
          <div key={linea.producto_id} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>{linea.producto_nombre}</div>
            <div className="form-row">
              <Field label="Cantidad Fabricada" required size="sm">
                <input
                  type="number" step="any" className="form-input"
                  value={linea.cantidad_fabricada}
                  onChange={e => updateLinea(linea.producto_id, { cantidad_fabricada: e.target.value })}
                />
              </Field>
              <Field label="Ubicación" required>
                <EntityPicker
                  resource="/costos/ubicaciones"
                  searchField="nombre"
                  value={linea.ubicacion_id}
                  onChange={v => updateLinea(linea.producto_id, { ubicacion_id: v })}
                  placeholder="Buscar ubicación…"
                />
              </Field>
              <Field label="Cantidad de Desperdicio" size="sm">
                <input
                  type="number" step="any" min="0" className="form-input"
                  value={linea.cantidad_desperdicio}
                  onChange={e => updateLinea(linea.producto_id, { cantidad_desperdicio: e.target.value })}
                />
              </Field>
              <Field label="Ubicación de Desperdicio" required={Number(linea.cantidad_desperdicio) > 0}>
                <EntityPicker
                  resource="/costos/ubicaciones"
                  searchField="nombre"
                  value={linea.ubicacion_desperdicio_id}
                  onChange={v => updateLinea(linea.producto_id, { ubicacion_desperdicio_id: v })}
                  placeholder="Buscar ubicación…"
                  disabled={Number(linea.cantidad_desperdicio) <= 0}
                />
              </Field>
              <Field label="Motivo de Desperdicio" required={Number(linea.cantidad_desperdicio) > 0}>
                <input
                  className="form-input"
                  value={linea.motivo_desperdicio}
                  onChange={e => updateLinea(linea.producto_id, { motivo_desperdicio: e.target.value })}
                  disabled={Number(linea.cantidad_desperdicio) <= 0}
                  placeholder="Ej: se quemó una tanda"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="card-footer">
        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={16} />}
            {saving ? 'Finalizando…' : 'Finalizar Orden'}
          </button>
        </div>
      </div>
    </div>
  );
};
