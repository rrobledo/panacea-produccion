import { forwardRef, useImperativeHandle } from 'react';
import { CostosLinesEditor } from './CostosLinesEditor';
import { useFetch } from '../../hooks';
import { useStagedList } from '../../hooks/useStagedList';
import { api } from '../../services/api';

/**
 * Add/edit/remove only stage changes locally (no network call) — the
 * parent (`ProductoEditPage`) calls `commit()` via ref when the producto's
 * own "Guardar" is clicked, persisting everything staged in one go.
 */
export const ProductoCostosDetail = forwardRef(({ productoId }, ref) => {
  const { data, loading, refetch } = useFetch(`/costos/productos/${productoId}/costos`);
  const staged = useStagedList(data || [], { idField: 'id' });

  useImperativeHandle(ref, () => ({
    isDirty: staged.isDirty,
    commit: () => staged.commit({
      create: (row) => api.post(`/costos/productos/${productoId}/costos`, {
        producto: productoId, insumo: row.insumo, cantidad: row.cantidad,
      }),
      update: (id, patch) => api.put(`/costos/productos/${productoId}/costos/${id}`, {
        producto: productoId, insumo: patch.insumo, cantidad: patch.cantidad,
      }),
      remove: (id) => api.delete(`/costos/productos/${productoId}/costos/${id}`),
    }).then(refetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [staged.isDirty, staged.commit, productoId]);

  return (
    <CostosLinesEditor
      items={staged.items}
      loading={loading}
      onAdd={staged.add}
      onEdit={staged.edit}
      onRemove={staged.remove}
    />
  );
});

ProductoCostosDetail.displayName = 'ProductoCostosDetail';
