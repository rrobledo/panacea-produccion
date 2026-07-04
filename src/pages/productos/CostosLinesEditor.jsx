import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal, ConfirmDialog } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { useConfirm } from '../../hooks';

/**
 * Presentational Costos (bill-of-materials) table + add/edit modal.
 * No fetching, no network — the caller supplies `items` and the
 * add/edit/remove callbacks, whether backed by staged-then-committed
 * state (Edit) or purely local state until the parent form submits (Create).
 */
export const CostosLinesEditor = ({ items, loading = false, onAdd, onEdit, onRemove }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [insumo, setInsumo] = useState(null);
  const [insumoRow, setInsumoRow] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const { confirm, dialog, resolve } = useConfirm();

  const openAdd = () => { setEditingId(null); setInsumo(null); setInsumoRow(null); setCantidad(''); setModalOpen(true); };
  const openEdit = (row) => { setEditingId(row.id); setInsumo(row.insumo); setInsumoRow(null); setCantidad(row.cantidad); setModalOpen(true); };

  const handleConfirm = () => {
    if (editingId != null) {
      onEdit(editingId, { cantidad: Number(cantidad) });
    } else {
      onAdd({
        insumo,
        cantidad: Number(cantidad),
        insumo_nombre: insumoRow?.nombre,
        insumo_unidad_medida: insumoRow?.unidad_medida,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea borrar el costo de "${row.insumo_nombre}"?`,
    });
    if (ok) onRemove(row.id);
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Costos del Producto</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={14} /> Agregar Costo
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Insumo</th><th>Cantidad</th><th>Medida</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Sin costos cargados</td></tr>
            ) : items.map(row => (
              <tr key={row.id} className={row._pending ? 'row-pending' : ''}>
                <td>{row.insumo_nombre}{row._pending && <span className="pending-badge">pendiente</span>}</td>
                <td>{row.cantidad}</td>
                <td>{row.insumo_unidad_medida}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>Editar</button>
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(row)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId != null ? 'Editar Costo' : 'Agregar Costo'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!insumo || cantidad === ''}>
            {editingId != null ? 'Aplicar' : 'Agregar'}
          </button>
        </>}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Insumo</label>
            <EntityPicker
              resource="/costos/insumos"
              searchField="nombre"
              value={insumo}
              onChange={setInsumo}
              onSelectRow={setInsumoRow}
              disabled={editingId != null}
            />
          </div>
          <div className="form-group field-w-sm">
            <label className="form-label">Cantidad</label>
            <input type="number" step="any" className="form-input" value={cantidad} onChange={e => setCantidad(e.target.value)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        onConfirm={() => resolve(true)}
        onCancel={() => resolve(false)}
      />
    </div>
  );
};
