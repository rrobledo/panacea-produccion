import { useNavigate } from 'react-router-dom';
import { MaquinaForm } from './MaquinaForm';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const MaquinaCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, loading } = useMutation((data) => api.post('/costos/maquinas', data), {
    onSuccess: () => { toast.success('Máquina creada correctamente'); navigate('/maquinaria'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al crear la máquina'),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><div className="page-title">Nueva Máquina</div></div>
      </div>
      <MaquinaForm onSubmit={mutate} onCancel={() => navigate('/maquinaria')} saving={loading} />
    </div>
  );
};
