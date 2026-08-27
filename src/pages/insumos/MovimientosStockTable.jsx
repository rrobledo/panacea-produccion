const TIPO_BADGE = { RESERVA: 'warning', CONSUMO: 'danger', AJUSTE: 'primary' };

export const MovimientosStockTable = ({ movimientos, loading }) => (
  <div className="card" style={{ marginTop: 20 }}>
    <div className="card-header"><h3 className="card-title">Historial de Movimientos</h3></div>
    <div className="table-container">
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Referencia</th></tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
          ) : !movimientos?.length ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Sin movimientos registrados</td></tr>
          ) : movimientos.map(m => (
            <tr key={m.id}>
              <td>{new Date(m.fecha).toLocaleString('es-AR')}</td>
              <td><span className={`badge badge-${TIPO_BADGE[m.tipo] || 'gray'}`}>{m.tipo}</span></td>
              <td>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
              <td>{m.referencia || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
