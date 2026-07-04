import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductoForm } from './ProductoForm';
import { CostosLinesEditor } from './CostosLinesEditor';
import { FormActions } from '../../components/ui';
import { useStagedList } from '../../hooks/useStagedList';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const ProductoCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const costos = useStagedList([], { idField: 'id' });

  const handleSubmit = async (values) => {
    setSaving(true);
    let created;
    try {
      const res = await api.post('/costos/productos', values);
      created = res.data;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al crear el producto');
      setSaving(false);
      return;
    }

    if (costos.items.length === 0) {
      setSaving(false);
      toast.success('Producto creado correctamente');
      navigate('/productos');
      return;
    }

    const results = await Promise.allSettled(
      costos.items.map(row => api.post(`/costos/productos/${created.id}/costos`, {
        producto: created.id, insumo: row.insumo, cantidad: row.cantidad,
      }))
    );
    const failedCount = results.filter(r => r.status === 'rejected').length;
    setSaving(false);

    if (failedCount > 0) {
      toast.error(`El producto se creó, pero ${failedCount} costo(s) no se pudieron guardar. Podés agregarlos desde la edición del producto.`);
      navigate(`/productos/${created.id}/edit`);
      return;
    }
    toast.success('Producto creado correctamente');
    navigate('/productos');
  };

  const handleCancel = () => {
    if (costos.isDirty) {
      const discard = window.confirm('Hay costos cargados sin guardar. ¿Desea salir de todas formas?');
      if (!discard) return;
    }
    navigate('/productos');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nuevo Producto</div>
        </div>
      </div>
      <ProductoForm onSubmit={handleSubmit} />
      <CostosLinesEditor items={costos.items} onAdd={costos.add} onEdit={costos.edit} onRemove={costos.remove} />
      <FormActions formId="producto-form" onCancel={handleCancel} saving={saving} />
    </div>
  );
};
