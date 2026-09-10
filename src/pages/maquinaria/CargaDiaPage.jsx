import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';
import { tipoLabel, ESTADO_CARGA } from './constants';

// El tablero que hace concreto "distribuir mejor la producción diaria". Leído
// de arriba abajo dice algo accionable en una sola pasada: sobra amasadora,
// falta horno. Por eso va ordenado por uso descendente.
//
// No propone horarios: el alcance es detectar que el día no entra (nivel N2,
// design.md D9).

const hoyISO = () => new Date().toISOString().slice(0, 10);

const Barra = ({ uso, estado }) => {
  const color = estado === 'SOBRECAPACIDAD' ? 'var(--danger, #9C3D34)'
    : estado === 'CUELLO_DE_BOTELLA' ? 'var(--warning, #B26B15)'
    : 'var(--primary)';
  return (
    <div style={{ background: 'var(--gray-200)', borderRadius: 4, height: 8, minWidth: 120, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(uso, 100)}%`, height: '100%', background: color }} />
    </div>
  );
};

export const CargaDiaPage = () => {
  const [fecha, setFecha] = useState(hoyISO());
  const { data, loading, error, refetch } = useFetch(`/costos/carga-dia?fecha=${fecha}`);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Carga del Día</div>
          <div className="page-subtitle">
            Cuánto pide la producción de cada tipo de máquina contra lo que da el turno
          </div>
        </div>
        <input
          type="date" className="form-input" style={{ width: 170 }}
          value={fecha} onChange={e => setFecha(e.target.value)}
        />
      </div>

      {loading && <PageLoader />}
      {error && <ErrorState message={getErrorMessage(error)} onRetry={refetch} />}

      {data && data.sobrecapacidad.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--danger, #9C3D34)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} />
            <div>
              <strong>El día no entra.</strong>{' '}
              {data.sobrecapacidad.map(f => tipoLabel(f.tipo)).join(', ')} se pasan del turno.
              Correr una masa a la tarde o adelantar la fermentación cuesta menos que agregar máquina.
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">{data.fecha}</h3></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Unidades</th>
                  <th>Capacidad del turno</th>
                  <th>Requerido</th>
                  <th>Uso</th>
                  <th></th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.filas.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                    No hay máquinas cargadas ni órdenes para esa fecha
                  </td></tr>
                ) : data.filas.map(f => (
                  <tr key={f.tipo}>
                    <td>
                      {tipoLabel(f.tipo)}
                      {f.concurrente && <span className="text-sm text-gray"> · concurrente</span>}
                    </td>
                    <td>{f.maquinas}</td>
                    <td>{f.capacidad_horas} h</td>
                    <td>{f.requerido_horas} h</td>
                    <td style={{ fontWeight: 600 }}>{f.uso} %</td>
                    <td><Barra uso={f.uso} estado={f.estado} /></td>
                    <td>
                      <span className={`badge badge-${ESTADO_CARGA[f.estado]?.badge || 'gray'}`}>
                        {ESTADO_CARGA[f.estado]?.label || f.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
