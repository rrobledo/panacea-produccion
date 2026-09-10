import { useNavigate } from 'react-router-dom';
import { ProcesoForm } from './ProcesoForm';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const ProcesoCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { mutate, loading } = useMutation((data) => api.post('/costos/procesos', data), {
    onSuccess: () => { toast.success('Proceso creado correctamente'); navigate('/procesos'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al crear el proceso'),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nuevo Proceso</div>
          <div className="page-subtitle">Qué consume, qué produce y con qué gramaje se parte</div>
        </div>
      </div>
      <ProcesoForm onSubmit={mutate} onCancel={() => navigate('/procesos')} saving={loading} />
    </div>
  );
};
