import { DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { KpiCard, DonutChart, GroupedBarChart } from '../components/charts';
import { PageLoader } from '../components/ui';
import { useFetch } from '../hooks';
import { formatCurrencyARS } from '../utils/format';

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const today = now.toISOString().slice(0, 10);

export const DashboardPage = () => {
  const resumen = useFetch('/costos/ctacteprovresumen', { fecha_desde: startOfMonth, fecha_hasta: today });
  const categoria = useFetch('/costos/get_produccion_by_category', { anio: now.getFullYear(), mes: now.getMonth() + 1 });
  const ventas = useFetch('/costos/get_ventas_por_cliente', { anio: now.getFullYear(), mes: now.getMonth() + 1 });

  if (resumen.loading || categoria.loading || ventas.loading) return <PageLoader />;

  const summary = Array.isArray(resumen.data) ? resumen.data[0] : resumen.data;
  const categoriaData = (categoria.data || []).map(r => ({ name: r.categoria, Planeado: r.planeado, Producido: r.producido }));

  // The endpoint returns, per client, both a monthly-total row (plain name)
  // and duplicate per-week breakdown rows (same name with a leading space) —
  // plus TOTAL/SUBTOTAL sentinel rows. Keep only the canonical monthly row
  // per client, or the weekly duplicates double-count every client's total.
  const ventasData = (ventas.data || [])
    .filter(r => r.cliente && r.cliente === r.cliente.trim() && !r.cliente.toUpperCase().includes('TOTAL'))
    .map(r => ({ name: r.cliente, value: r.subtotal ?? 0 }));
  const totalVentasMes = ventasData.reduce((sum, r) => sum + r.value, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Resumen de producción y cuenta corriente de proveedores</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <KpiCard label="Facturas Pendientes" value={formatCurrencyARS(summary?.total_facturas_pendientes)} icon={AlertCircle} color="#d97706" />
        <KpiCard label="Gastos del Mes" value={formatCurrencyARS(summary?.total_gastos)} icon={DollarSign} color="#dc2626" />
        <KpiCard label="Ventas del Mes" value={formatCurrencyARS(totalVentasMes)} icon={TrendingUp} color="#16a34a" />
      </div>

      <div className="grid-2">
        <GroupedBarChart data={categoriaData} keys={['Planeado', 'Producido']} title="Producción por Categoría" />
        <DonutChart data={ventasData} title="Ventas por Cliente" />
      </div>
    </div>
  );
};
