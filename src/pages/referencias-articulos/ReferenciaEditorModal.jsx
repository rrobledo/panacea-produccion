import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, ConfirmDialog } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { useConfirm } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { SUCURSAL_LABEL } from './constants';

let nextKey = 0;
const nuevaLinea = (rel = {}) => ({
  key: ++nextKey,
  producto_id: rel.producto_id ?? null,
  unidad_conversion: rel.unidad_conversion != null ? String(rel.unidad_conversion) : '1',
});

// Errores por línea, indexados por `key`. Cantidad entera >= 1 y sin productos
// repetidos: lo mismo que valida el backend, para no mandar un PUT que se sabe
// que va a volver con 422.
const validar = (lineas) => {
  const errores = {};
  const vistos = new Set();
  for (const l of lineas) {
    if (l.producto_id == null) {
      errores[l.key] = 'Elegí un producto';
    } else if (vistos.has(l.producto_id)) {
      errores[l.key] = 'Producto repetido';
    } else if (!/^\d+$/.test(l.unidad_conversion) || Number(l.unidad_conversion) < 1) {
      errores[l.key] = 'La cantidad debe ser un entero mayor o igual a 1';
    }
    if (l.producto_id != null) vistos.add(l.producto_id);
  }
  return errores;
};

/**
 * Editor de la relación de un artículo de caja con los productos fabricados.
 * Se monta una vez por apertura (el padre le pasa `key`), así que el estado
 * inicial sale directo de `articulo.relaciones`. Guarda el conjunto completo
 * en un solo PUT: el backend reemplaza todas las filas del artículo.
 */
export const ReferenciaEditorModal = ({ articulo, onClose, onSaved }) => {
  const toast = useToast();
  const { confirm, dialog, resolve } = useConfirm();
  const [lineas, setLineas] = useState(() =>
    articulo.relaciones.length ? articulo.relaciones.map(nuevaLinea) : [nuevaLinea()]
  );
  const [saving, setSaving] = useState(false);

  const errores = validar(lineas);
  const hayErrores = Object.keys(errores).length > 0;

  const actualizar = (key, cambios) =>
    setLineas(ls => ls.map(l => (l.key === key ? { ...l, ...cambios } : l)));
  const quitar = (key) => setLineas(ls => ls.filter(l => l.key !== key));
  const agregar = () => setLineas(ls => [...ls, nuevaLinea()]);

  const guardar = async () => {
    if (hayErrores) return;
    if (lineas.length === 0 && articulo.relaciones.length > 0) {
      const ok = await confirm({
        title: 'Desvincular artículo',
        message: `"${articulo.nombre}" va a quedar sin productos asociados y volverá a figurar como pendiente. ¿Continuar?`,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await api.put(`/costos/referencias-articulos/${articulo.idarticulo}`, {
        relaciones: lineas.map(l => ({ producto_id: l.producto_id, unidad_conversion: Number(l.unidad_conversion) })),
      });
      toast.success('Relación guardada');
      onSaved();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={`${articulo.idarticulo} · ${articulo.nombre}`}
        footer={<>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={saving || hayErrores}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>}
      >
        <div className="page-subtitle" style={{ marginBottom: 12 }}>
          {SUCURSAL_LABEL[articulo.sucursal]} · {articulo.categoria}
          {articulo.precio != null && <> · ${Number(articulo.precio).toLocaleString('es-AR')}</>}
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Producto fabricado</th><th style={{ width: 120 }}>Cantidad</th><th style={{ width: 48 }}></th></tr></thead>
            <tbody>
              {lineas.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                  Sin productos: al guardar, el artículo queda pendiente
                </td></tr>
              ) : lineas.map(l => (
                <tr key={l.key}>
                  <td>
                    <EntityPicker
                      resource="/costos/productos"
                      searchField="nombre"
                      value={l.producto_id}
                      onChange={(id) => actualizar(l.key, { producto_id: id })}
                      placeholder="Buscar producto…"
                      extraColumns={[{ field: 'categoria', header: 'Categoría' }]}
                    />
                    {errores[l.key] && <div className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>{errores[l.key]}</div>}
                  </td>
                  <td>
                    <input
                      type="number" min="1" step="1" className="form-input"
                      value={l.unidad_conversion}
                      onChange={e => actualizar(l.key, { unidad_conversion: e.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => quitar(l.key)} title="Quitar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={agregar}>
          <Plus size={14} /> Agregar producto
        </button>

        <div className="page-subtitle" style={{ marginTop: 16, fontSize: 12 }}>
          Cantidad = unidades del producto por cada unidad vendida del artículo (una promo de 6 medialunas lleva 6).
          Los reportes de ventas se recalculan con esta relación, incluidos los meses anteriores.
        </div>
      </Modal>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        onConfirm={() => resolve(true)}
        onCancel={() => resolve(false)}
      />
    </>
  );
};
