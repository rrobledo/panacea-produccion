import { useState } from 'react';
import { PageLoader, ErrorState } from '../../components/ui';
import { useList, useMutation } from '../../hooks';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMessage';

// Sin tarifa por centro no hay costo de mano de obra real: hoy
// `costo_unitario_mo` aparece en los reportes sin ninguna fuente que lo
// alimente. Ver design.md D14 y la pregunta abierta sobre quién carga estas
// tarifas y cada cuánto se revisan.

export const CentrosTrabajoPage = () => {
  const toast = useToast();
  const { items, loading, error, refetch } = useList('/costos/centros-trabajo');
  const [editando, setEditando] = useState({});

  const { mutate: guardar, loading: saving } = useMutation(
    ({ id, valores }) => api.put(`/costos/centros-trabajo/${id}`, valores),
    {
      onSuccess: () => { toast.success('Centro actualizado'); setEditando({}); refetch(); },
      onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar'),
    },
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const valorDe = (centro, campo) => editando[centro.id]?.[campo] ?? centro[campo];
  const cambiar = (centro, campo, valor) =>
    setEditando(prev => ({ ...prev, [centro.id]: { ...prev[centro.id], [campo]: valor } }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Centros de Trabajo</div>
          <div className="page-subtitle">
            Tarifa horaria y capacidad de turno de cada área
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Centro</th><th>Tarifa por hora</th><th>Horas de turno</th><th></th></tr>
            </thead>
            <tbody>
              {(items || []).map(centro => (
                <tr key={centro.id}>
                  <td>{centro.nombre}</td>
                  <td>
                    <input
                      type="number" step="any" min="0" className="form-input" style={{ width: 140 }}
                      value={valorDe(centro, 'tarifa_hora')}
                      onChange={e => cambiar(centro, 'tarifa_hora', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any" min="0" className="form-input" style={{ width: 120 }}
                      value={valorDe(centro, 'horas_turno')}
                      onChange={e => cambiar(centro, 'horas_turno', e.target.value)}
                    />
                  </td>
                  <td>
                    {editando[centro.id] && (
                      <button
                        className="btn btn-primary btn-sm" disabled={saving}
                        onClick={() => guardar({
                          id: centro.id,
                          valores: {
                            nombre: centro.nombre,
                            tarifa_hora: Number(valorDe(centro, 'tarifa_hora')),
                            horas_turno: Number(valorDe(centro, 'horas_turno')),
                            habilitado: centro.habilitado,
                          },
                        })}
                      >
                        Guardar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ color: 'var(--gray-500)' }}>
          Las tarifas arrancan en cero a propósito: poner un número inventado sería peor que dejarlo
          vacío. Mientras estén en cero, el costo de mano de obra del reporte también es cero.
        </div>
      </div>
    </div>
  );
};
