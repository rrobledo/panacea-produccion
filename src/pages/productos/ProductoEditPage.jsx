import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductoForm } from './ProductoForm';
import { ProductoCostosDetail } from './ProductoCostosDetail';
import { PageLoader, ErrorState, FormActions } from '../../components/ui';
import { useFetch } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProductoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/productos/${id}`);
  const [saving, setSaving] = useState(false);
  const costosRef = useRef(null);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await api.put(`/costos/productos/${id}`, values);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar los cambios');
      setSaving(false);
      return;
    }
    try {
      await costosRef.current?.commit();
    } catch {
      toast.error('El producto se guardó, pero algunos costos no se pudieron guardar. Volvé a intentar.');
      setSaving(false);
      return;
    }
    setSaving(false);
    toast.success('Producto actualizado correctamente');
    navigate('/productos');
  };

  const handleCancel = () => {
    if (costosRef.current?.isDirty) {
      const discard = window.confirm('Hay cambios sin guardar en Costos del Producto. ¿Desea salir de todas formas?');
      if (!discard) return;
    }
    navigate('/productos');
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Producto</div>
        </div>
      </div>
      <ProductoForm initialData={data} onSubmit={handleSubmit} isEdit />
      <ProductoCostosDetail ref={costosRef} productoId={id} />
      <FormActions formId="producto-form" onCancel={handleCancel} saving={saving} />
    </div>
  );
};
