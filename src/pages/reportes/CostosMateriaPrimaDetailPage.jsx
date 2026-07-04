import { useNavigate, useParams } from 'react-router-dom';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch } from '../../hooks';
import { formatCurrencyARS, formatPercent } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const Stat = ({ label, value }) => (
  <div>
    <div className="form-label">{label}</div>
    <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
  </div>
);

export const CostosMateriaPrimaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch(`/costos/costos_materia_prima/${id}`);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const detalle = data?.detalle_costo || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">{data?.producto_nombre}</div>
          <div className="page-subtitle">Detalle de costo de materia prima</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reportes/costo-materia-prima')}>Volver</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body grid-3">
          <Stat label="Lote Producción" value={data?.lote_produccion} />
          <Stat label="Tiempo Producción" value={data?.tiempo_produccion} />
          <Stat label="Precio Actual" value={formatCurrencyARS(data?.precio_actual)} />
          <Stat label="Costo MP" value={formatCurrencyARS(data?.costo_unitario_mp)} />
          <Stat label="Margen Utilidad MP" value={formatPercent(data?.margen_utilidad)} />
          <Stat label="Costo Lote Producción" value={formatCurrencyARS(data?.costo_lote_mp)} />
          <Stat label="Venta Estimada Mensual" value={formatCurrencyARS(data?.venta_estimada_mensual)} />
          <Stat label="Costo Estimado Mensual" value={formatCurrencyARS(data?.costo_estimado_mensual)} />
          <Stat label="Utilidad Mensual" value={formatPercent(data?.utilidad_mensual)} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Detalle de Insumos</h3></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Insumo</th><th>Cantidad</th><th>Costo</th><th>% del Total</th></tr></thead>
            <tbody>
              {detalle.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Sin datos</td></tr>
              ) : detalle.map((d, i) => (
                <tr key={i}>
                  <td>{d.insumo_nombre}</td>
                  <td>{d.cantidad}</td>
                  <td>{formatCurrencyARS(d.costo_individual)}</td>
                  <td>{formatPercent(d.porcentaje_del_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
