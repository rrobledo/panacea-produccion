import { forwardRef, useImperativeHandle } from 'react';
import { InsumosLinesEditor } from './InsumosLinesEditor';
import { useFetch } from '../../hooks';
import { useStagedList } from '../../hooks/useStagedList';
import { useEntityNames } from '../../hooks/useEntityNames';
import { api } from '../../services/api';

/**
 * Lets a user see and manage which insumos (raw materials) a factura/gasto
 * is billing for. Agregar/Quitar only stage changes locally (no network
 * call) — the parent (`FacturaEditPage`) calls `commit()` via ref when the
 * factura's own "Guardar" is clicked, persisting everything staged at once.
 */
export const FacturaInsumosDetail = forwardRef(({ facturaId }, ref) => {
  const { data, loading, refetch } = useFetch(`/costos/ctacteprov/${facturaId}/insumos`);
  const existingRows = data || [];

  const staged = useStagedList(existingRows, { idField: 'id' });

  // Resolve existing rows' insumo name individually (DetalleInsumoRead has
  // no denormalized name) instead of fetching the entire insumos table.
  // Staged (pending) rows already carry their name from the picker.
  const insumoNames = useEntityNames('/costos/insumos', existingRows.map(r => r.insumo), 'nombre');

  useImperativeHandle(ref, () => ({
    isDirty: staged.isDirty,
    commit: () => staged.commit({
      create: (row) => api.post(`/costos/ctacteprov/${facturaId}/insumos`, {
        insumo: row.insumo, cantidad: row.cantidad, subtotal: row.subtotal,
      }),
      update: () => Promise.reject(new Error('Editar un insumo existente no está soportado')),
      remove: (id) => api.delete(`/costos/ctacteprov/${facturaId}/insumos/${id}`),
    }).then(refetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [staged.isDirty, staged.commit, facturaId, refetch]);

  return (
    <InsumosLinesEditor
      items={staged.items}
      loading={loading}
      onAdd={staged.add}
      onRemove={staged.remove}
      resolveNombre={(id) => insumoNames[id]}
    />
  );
});

FacturaInsumosDetail.displayName = 'FacturaInsumosDetail';
