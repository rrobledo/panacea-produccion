import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FacturaForm } from './FacturaForm';
import { FacturaPagos } from './FacturaPagos';
import { FacturaInsumosDetail } from './FacturaInsumosDetail';
import { PageLoader, ErrorState, FormActions } from '../../components/ui';
import { useFetch } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const FacturaEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/ctacteprov/${id}`);
  const [saving, setSaving] = useState(false);
  const pagosRef = useRef(null);
  const insumosRef = useRef(null);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await api.put(`/costos/ctacteprov/${id}`, values);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar los cambios');
      setSaving(false);
      return;
    }

    const results = await Promise.allSettled([
      pagosRef.current?.commit(),
      insumosRef.current?.commit(),
    ]);
    const failedSections = results
      .map((r, i) => ({ r, name: i === 0 ? 'Pagos' : 'Detalle de Insumos' }))
      .filter(({ r }) => r.status === 'rejected');

    setSaving(false);
    if (failedSections.length > 0) {
      toast.error(`La factura se guardó, pero ${failedSections.map(f => f.name).join(' y ')} tuvo cambios que no se pudieron guardar. Volvé a intentar.`);
      return;
    }
    toast.success('Registro actualizado correctamente');
    navigate('/ctacteprov');
  };

  const handleCancel = () => {
    if (pagosRef.current?.isDirty || insumosRef.current?.isDirty) {
      const discard = window.confirm('Hay cambios sin guardar en Pagos o Detalle de Insumos. ¿Desea salir de todas formas?');
      if (!discard) return;
    }
    navigate('/ctacteprov');
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Factura/Gasto</div>
        </div>
      </div>
      <FacturaForm initialData={data} onSubmit={handleSubmit} />
      {data && <FacturaPagos ref={pagosRef} factura={data} />}
      <FacturaInsumosDetail ref={insumosRef} facturaId={id} />
      <FormActions formId="factura-form" onCancel={handleCancel} saving={saving} />
    </div>
  );
};
