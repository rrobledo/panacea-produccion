import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { Modal, ConfirmDialog, EmptyState } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { useConfirm } from '../../hooks';
import { formatCurrencyARS } from '../../utils/format';

/**
 * Presentational Detalle de Insumos table + add modal. No fetching, no
 * network — the caller supplies `items` and the add/remove callbacks,
 * whether backed by staged-then-committed state (Edit) or purely local
 * state until the parent form submits (Create).
 *
 * `resolveNombre` is optional: existing rows loaded from the backend only
 * carry an insumo id (no denormalized name); the Edit wrapper passes a
 * per-id name resolver. Staged (pending) rows always carry their own name
 * from the picker and never need it.
 */
export const InsumosLinesEditor = ({ items, loading = false, onAdd, onRemove, resolveNombre }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [selectedInsumoRow, setSelectedInsumoRow] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const { confirm, dialog, resolve } = useConfirm();

  const openAdd = () => { setSelectedInsumo(null); setSelectedInsumoRow(null); setCantidad(''); setModalOpen(true); };

  const handleStage = () => {
    const subtotal = Number(cantidad) * Number(selectedInsumoRow?.precio ?? 0);
    onAdd({ insumo: selectedInsumo, cantidad: Number(cantidad), subtotal, insumo_nombre: selectedInsumoRow?.nombre });
    setModalOpen(false);
  };

  const nameFor = (row) => row.insumo_nombre ?? resolveNombre?.(row.insumo) ?? `#${row.insumo}`;

  const handleRemove = async (row) => {
    const ok = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Está seguro que desea quitar el insumo "${nameFor(row)}" de esta factura?`,
    });
    if (ok) onRemove(row.id);
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Detalle de Insumos</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={14} /> Agregar Insumo
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin insumos cargados"
          description="Esta factura/gasto todavía no tiene insumos asociados."
          action={<button type="button" className="btn btn-secondary btn-sm" onClick={openAdd}>Agregar el primero</button>}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Insumo</th><th>Cantidad</th><th>Costo</th><th></th></tr></thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className={row._pending ? 'row-pending' : ''}>
                  <td>
                    {nameFor(row)}
                    {row._pending && <span className="pending-badge">pendiente</span>}
                  </td>
                  <td>{row.cantidad}</td>
                  <td>{formatCurrencyARS(row.subtotal)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemove(row)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Agregar Insumo"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleStage} disabled={!selectedInsumo || cantidad === ''}>
            Agregar
          </button>
        </>}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Insumo</label>
            <EntityPicker
              resource="/costos/insumos"
              searchField="nombre"
              value={selectedInsumo}
              onChange={setSelectedInsumo}
              onSelectRow={setSelectedInsumoRow}
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
