import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacturaForm } from './FacturaForm';
import { InsumosLinesEditor } from './InsumosLinesEditor';
import { FormActions } from '../../components/ui';
import { useStagedList } from '../../hooks/useStagedList';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const FacturaCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const insumos = useStagedList([], { idField: 'id' });

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await api.post('/costos/ctacteprov', {
        ...values,
        insumos: insumos.items.length
          ? insumos.items.map(row => ({ insumo: row.insumo, cantidad: row.cantidad, subtotal: row.subtotal }))
          : undefined,
      });
      toast.success('Registro creado correctamente');
      navigate('/ctacteprov');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al crear el registro');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (insumos.isDirty) {
      const discard = window.confirm('Hay insumos cargados sin guardar. ¿Desea salir de todas formas?');
      if (!discard) return;
    }
    navigate('/ctacteprov');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nueva Factura/Gasto</div>
        </div>
      </div>
      <FacturaForm onSubmit={handleSubmit} />
      <InsumosLinesEditor items={insumos.items} onAdd={insumos.add} onRemove={insumos.remove} />
      <FormActions formId="factura-form" onCancel={handleCancel} saving={saving} />
    </div>
  );
};
