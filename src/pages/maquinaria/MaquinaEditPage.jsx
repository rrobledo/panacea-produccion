import { useNavigate, useParams } from 'react-router-dom';
import { MaquinaForm } from './MaquinaForm';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const MaquinaEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/maquinas/${id}`);

  const { mutate, loading: saving } = useMutation((values) => api.put(`/costos/maquinas/${id}`, values), {
    onSuccess: () => { toast.success('Máquina actualizada correctamente'); navigate('/maquinaria'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los cambios'),
  });

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Máquina</div>
          <div className="page-subtitle">{data?.nombre}</div>
        </div>
      </div>
      <MaquinaForm initialData={data} onSubmit={mutate} onCancel={() => navigate('/maquinaria')} saving={saving} />
    </div>
  );
};
