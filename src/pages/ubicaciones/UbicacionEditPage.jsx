import { useNavigate, useParams } from 'react-router-dom';
import { UbicacionForm } from './UbicacionForm';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const UbicacionEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/ubicaciones/${id}`);

  const { mutate, loading: saving } = useMutation((values) => api.put(`/costos/ubicaciones/${id}`, values), {
    onSuccess: () => { toast.success('Ubicación actualizada correctamente'); navigate('/ubicaciones'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los cambios'),
  });

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Ubicación</div>
        </div>
      </div>
      <UbicacionForm initialData={data} onSubmit={mutate} onCancel={() => navigate('/ubicaciones')} saving={saving} />
    </div>
  );
};
