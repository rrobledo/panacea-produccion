import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { useFetch } from '../../hooks';
import { PageLoader, ErrorState } from '../../components/ui';
import { formatCurrencyARS } from '../../utils/format';
import { ANIOS, MESES_CON_TODOS } from './constants';
import { getErrorMessage } from '../../utils/errorMessage';

const now = new Date();

export const VentasPage = () => {
  const [filters, setFilters] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1, cliente: 'Todos' });
  const { data, loading, error, refetch } = useFetch('/costos/get_ventas_por_cliente', { ...filters });
  const contentRef = useRef(null);
  const print = useReactToPrint({ contentRef });

  const applyFilters = () => refetch({ ...filters });

  const rows = data || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Ventas por Cliente</div>
          <div className="page-subtitle">Cantidades y totales por período y cliente</div>
        </div>
        <button className="btn btn-secondary btn-sm no-print" onClick={print}><Printer size={14} /> Imprimir</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body form-row">
          <div className="form-group field-w-xs">
            <label className="form-label">Año</label>
            <select className="form-select" value={filters.anio} onChange={e => setFilters(f => ({ ...f, anio: Number(e.target.value) }))}>
              {ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Mes</label>
            <select className="form-select" value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: Number(e.target.value) }))}>
              {MESES_CON_TODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Cliente</label>
            <input className="form-input" value={filters.cliente} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="Todos" />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={applyFilters}>Aplicar Filtros</button>
          </div>
        </div>
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={getErrorMessage(error)} onRetry={applyFilters} /> : (
        <div className="card" ref={contentRef}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Período</th><th rowSpan={2}>Cliente</th>
                  <th colSpan={3}>Cantidad</th><th colSpan={3}>Totales</th>
                </tr>
                <tr>
                  <th>Mañana</th><th>Tarde</th><th>Total</th>
                  <th>Mañana</th><th>Tarde</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.week_of_month}</td><td>{r.cliente}</td>
                    <td>{r.cantidad_maniana}</td><td>{r.cantidad_tarde}</td><td>{r.cantidad}</td>
                    <td>{formatCurrencyARS(r.subtotal_maniana)}</td>
                    <td>{formatCurrencyARS(r.subtotal_tarde)}</td>
                    <td>{formatCurrencyARS(r.subtotal)}</td>
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
