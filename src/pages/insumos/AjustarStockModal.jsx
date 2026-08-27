import { useState } from 'react';
import { Modal, Field } from '../../components/ui';

export const AjustarStockModal = ({ open, onClose, onConfirm, saving }) => {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  const handleClose = () => { setCantidad(''); setMotivo(''); onClose(); };
  const handleConfirm = () => onConfirm({ cantidad: Number(cantidad), motivo })
    .then(() => { setCantidad(''); setMotivo(''); })
    .catch(() => {}); // error already surfaced via toast by the caller's useMutation

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ajustar Stock"
      footer={<>
        <button className="btn btn-secondary" onClick={handleClose} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || cantidad === '' || !motivo}>
          {saving ? 'Guardando…' : 'Confirmar Ajuste'}
        </button>
      </>}
    >
      <div className="form-row">
        <Field label="Cantidad" required hint="Positiva para sumar stock, negativa para restar" size="sm">
          <input
            type="number"
            step="any"
            className="form-input"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            placeholder="Ej: -5 o 20"
          />
        </Field>
        <Field label="Motivo" required>
          <input
            className="form-input"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Merma por rotura, recuento físico, compra sin factura…"
          />
        </Field>
      </div>
    </Modal>
  );
};
