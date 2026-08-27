import { useNavigate } from 'react-router-dom';
import { UbicacionForm } from './UbicacionForm';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const UbicacionCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { mutate, loading } = useMutation((data) => api.post('/costos/ubicaciones', data), {
    onSuccess: () => { toast.success('Ubicación creada correctamente'); navigate('/ubicaciones'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al crear la ubicación'),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nueva Ubicación</div>
        </div>
      </div>
      <UbicacionForm onSubmit={mutate} onCancel={() => navigate('/ubicaciones')} saving={loading} />
    </div>
  );
};
