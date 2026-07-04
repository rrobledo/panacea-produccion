import { useNavigate } from 'react-router-dom';
import { InsumoForm } from './InsumoForm';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const InsumoCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { mutate, loading } = useMutation((data) => api.post('/costos/insumos', data), {
    onSuccess: () => { toast.success('Insumo creado correctamente'); navigate('/insumos'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al crear el insumo'),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nuevo Insumo</div>
        </div>
      </div>
      <InsumoForm onSubmit={mutate} onCancel={() => navigate('/insumos')} saving={loading} />
    </div>
  );
};
