import { useState, forwardRef, useImperativeHandle } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../components/ui';
import { useFetch } from '../../hooks';
import { useStagedList } from '../../hooks/useStagedList';
import { api } from '../../services/api';
import { formatCurrencyARS } from '../../utils/format';
import { TIPOS_PAGO, CAJAS } from './constants';

/**
 * Registrar Pago only stages the payment locally (no network call) — the
 * parent (`FacturaEditPage`) calls `commit()` via ref when the factura's
 * own "Guardar" is clicked, persisting every staged payment in one go.
 */
export const FacturaPagos = forwardRef(({ factura }, ref) => {
  const { data, loading, refetch } = useFetch(`/costos/ctacteprov/${factura.id}/pagos`);
  const staged = useStagedList(data || [], { idField: 'id' });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    numero: '', fecha_emision: new Date().toISOString().slice(0, 10),
    importe_total: '', tipo_pago: 'TRANSFERENCIA', caja: 'VA',
  }));

  useImperativeHandle(ref, () => ({
    isDirty: staged.isDirty,
    commit: () => staged.commit({
      create: (row) => api.post('/costos/ctacteprov', row),
      update: () => Promise.reject(new Error('Editar un pago existente no está soportado')),
      remove: () => Promise.reject(new Error('Eliminar un pago existente no está soportado')),
    }).then(refetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [staged.isDirty, staged.commit, refetch]);

  const openAdd = () => {
    setForm({ numero: '', fecha_emision: new Date().toISOString().slice(0, 10), importe_total: '', tipo_pago: 'TRANSFERENCIA', caja: 'VA' });
    setModalOpen(true);
  };

  const handleStage = () => {
    staged.add({
      proveedor: factura.proveedor,
      factura_id: factura.id,
      tipo_movimiento: 'PAGO',
      categoria: 'OTROS',
      numero: form.numero,
      fecha_emision: form.fecha_emision,
      importe_total: Number(form.importe_total),
      tipo_pago: form.tipo_pago,
      caja: form.caja,
    });
    setModalOpen(false);
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Pagos</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={14} /> Registrar Pago
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Fecha Pago</th><th>Importe</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : staged.items.length === 0 ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Sin pagos registrados</td></tr>
            ) : staged.items.map(row => (
              <tr key={row.id} className={row._pending ? 'row-pending' : ''}>
                <td>{row.fecha_emision}{row._pending && <span className="pending-badge">pendiente</span>}</td>
                <td>{formatCurrencyARS(row.importe_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Pago"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleStage} disabled={!form.numero || !form.importe_total}>
            Agregar
          </button>
        </>}
      >
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Número Comprobante</label>
            <input className="form-input" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de Pago</label>
            <input type="date" className="form-input" value={form.fecha_emision} onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Importe Total</label>
            <input type="number" step="0.01" className="form-input" value={form.importe_total} onChange={e => setForm(f => ({ ...f, importe_total: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Pago</label>
            <select className="form-select" value={form.tipo_pago} onChange={e => setForm(f => ({ ...f, tipo_pago: e.target.value }))}>
              {TIPOS_PAGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Caja</label>
            <select className="form-select" value={form.caja} onChange={e => setForm(f => ({ ...f, caja: e.target.value }))}>
              {CAJAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
});

FacturaPagos.displayName = 'FacturaPagos';
