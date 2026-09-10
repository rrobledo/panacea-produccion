import { useState } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { ErrorState, EmptyState } from '../../components/ui';
import { useMutation } from '../../hooks';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errorMessage';

// El reporte que hay que mirar antes de dejar que el motor nuevo cambie lo que
// se reserva. No persiste nada: pide las dos explosiones para una fecha y las
// pone lado a lado. Ver openspec/changes/masa-procesos-y-maquinaria/ tarea 4.8.

const hoyISO = () => new Date().toISOString().slice(0, 10);

export const ComparacionPage = () => {
  const [fecha, setFecha] = useState(hoyISO());
  const [resultado, setResultado] = useState(null);

  const { mutate, loading, error } = useMutation(
    (f) => api.post('/costos/ordenes-produccion/comparar', { fecha: f }),
    { onSuccess: (res) => setResultado(res.data) },
  );

  const cambian = resultado?.filas?.filter(f => f.cambia) ?? [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Comparación de Motores</div>
          <div className="page-subtitle">
            Qué cantidades de insumo cambiarían si la explosión pasara a calcularse por el grafo
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date" className="form-input" value={fecha}
            onChange={e => setFecha(e.target.value)} style={{ width: 170 }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => mutate(fecha)} disabled={loading}>
            <Play size={14} /> {loading ? 'Calculando…' : 'Comparar'}
          </button>
        </div>
      </div>

      {error && <ErrorState message={getErrorMessage(error)} onRetry={() => mutate(fecha)} />}

      {!resultado && !error && (
        <EmptyState
          title="Elegí una fecha"
          description="El reporte usa lo programado para esa fecha y no escribe nada: se puede correr las veces que haga falta."
        />
      )}

      {resultado && !resultado.comparable && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--warning, #B26B15)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={16} /> La comparación está incompleta
            </h3>
          </div>
          <div className="card-body">
            <p style={{ marginTop: 0 }}>
              El motor nuevo no pudo calcular todas las ramas, así que las diferencias de abajo son
              parciales y no sirven para decidir. Falta esto:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
              {resultado.pendientes.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>
      )}

      {resultado && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {resultado.fecha} · {resultado.insumos_que_cambian} de {resultado.filas.length} insumos cambian
            </h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th style={{ textAlign: 'right' }}>Motor viejo</th>
                  <th style={{ textAlign: 'right' }}>Motor nuevo</th>
                  <th style={{ textAlign: 'right' }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {resultado.filas.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                    No hay nada programado para esa fecha
                  </td></tr>
                ) : resultado.filas.map(f => (
                  <tr key={f.insumo_id} style={f.cambia ? { background: 'var(--gray-50)' } : undefined}>
                    <td>{f.insumo_nombre || `Insumo ${f.insumo_id}`}</td>
                    <td style={{ textAlign: 'right' }}>{f.motor_viejo}</td>
                    <td style={{ textAlign: 'right' }}>{f.motor_nuevo}</td>
                    <td style={{ textAlign: 'right', fontWeight: f.cambia ? 600 : 400 }}>
                      {f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cambian.length > 0 && (
            <div className="card-footer" style={{ color: 'var(--gray-500)' }}>
              Los insumos resaltados son los que la operación va a ver distinto el día que se
              active el motor nuevo.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
