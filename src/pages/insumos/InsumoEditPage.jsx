import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InsumoForm } from './InsumoForm';
import { AjustarStockModal } from './AjustarStockModal';
import { MovimientosStockTable } from './MovimientosStockTable';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const InsumoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/insumos/${id}`);
  const { data: movimientos, loading: loadingMovimientos, refetch: refetchMovimientos } = useFetch(`/costos/insumos/${id}/movimientos`);
  const [ajusteOpen, setAjusteOpen] = useState(false);

  const { mutate, loading: saving } = useMutation((values) => api.put(`/costos/insumos/${id}`, values), {
    onSuccess: () => { toast.success('Insumo actualizado correctamente'); navigate('/insumos'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los cambios'),
  });

  const { mutate: ajustar, loading: ajustando } = useMutation(
    (payload) => api.post(`/costos/insumos/${id}/movimientos`, payload),
    {
      onSuccess: () => {
        toast.success('Stock ajustado correctamente');
        setAjusteOpen(false);
        refetch();
        refetchMovimientos();
      },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al ajustar el stock'),
    }
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Insumo</div>
          {data && (
            <div className="page-subtitle">
              Comprometido: {data.comprometido} · Disponible: {data.disponible}
            </div>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAjusteOpen(true)}>
          Ajustar Stock
        </button>
      </div>
      <InsumoForm initialData={data} onSubmit={mutate} onCancel={() => navigate('/insumos')} saving={saving} isEdit />

      <MovimientosStockTable movimientos={movimientos} loading={loadingMovimientos} />

      <AjustarStockModal
        open={ajusteOpen}
        onClose={() => setAjusteOpen(false)}
        onConfirm={ajustar}
        saving={ajustando}
      />
    </div>
  );
};
