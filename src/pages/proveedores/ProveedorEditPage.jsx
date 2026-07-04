import { useNavigate, useParams } from 'react-router-dom';
import { ProveedorForm } from './ProveedorForm';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

export const ProveedorEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(`/costos/proveedores/${id}`);

  const { mutate, loading: saving } = useMutation((values) => api.put(`/costos/proveedores/${id}`, values), {
    onSuccess: () => { toast.success('Proveedor actualizado correctamente'); navigate('/proveedores'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar los cambios'),
  });

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Editar Proveedor</div>
        </div>
      </div>
      <ProveedorForm initialData={data} onSubmit={mutate} onCancel={() => navigate('/proveedores')} saving={saving} />
    </div>
  );
};
