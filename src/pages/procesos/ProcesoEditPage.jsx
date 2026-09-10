import { useNavigate, useParams } from 'react-router-dom';
import { ProcesoForm } from './ProcesoForm';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProcesoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/procesos/${id}`);

  const { mutate, loading: saving } = useMutation((values) => api.put(`/costos/procesos/${id}`, values), {
    onSuccess: (res) => {
      // Si la receta ya la usó una orden, el backend abre una versión nueva en
      // vez de editar la que esa orden guardó — ver design.md D12.
      const nueva = res?.data?.id != null && String(res.data.id) !== String(id);
      toast.success(nueva
        ? `Se creó la versión ${res.data.version}: la anterior queda como la usó su orden`
        : 'Proceso actualizado correctamente');
      navigate('/procesos');
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los cambios'),
  });

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Proceso</div>
          <div className="page-subtitle">
            {data?.nombre} · versión {data?.version}
          </div>
        </div>
      </div>
      <ProcesoForm initialData={data} onSubmit={mutate} onCancel={() => navigate('/procesos')} saving={saving} />
    </div>
  );
};
