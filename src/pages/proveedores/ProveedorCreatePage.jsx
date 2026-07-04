import { useNavigate } from 'react-router-dom';
import { ProveedorForm } from './ProveedorForm';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const ProveedorCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { mutate, loading } = useMutation((data) => api.post('/costos/proveedores', data), {
    onSuccess: () => { toast.success('Proveedor creado correctamente'); navigate('/proveedores'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al crear el proveedor'),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Nuevo Proveedor</div>
        </div>
      </div>
      <ProveedorForm onSubmit={mutate} onCancel={() => navigate('/proveedores')} saving={loading} />
    </div>
  );
};
