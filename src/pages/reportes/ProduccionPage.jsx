import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { useFetch } from '../../hooks';
import { PageLoader } from '../../components/ui';
import { formatCurrencyARS, formatPercent } from '../../utils/format';
import { ANIOS, MESES, SEMANAS } from './constants';

const now = new Date();

export const ProduccionPage = () => {
  const [filters, setFilters] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1, semana: 0 });

  const categoria = useFetch('/costos/get_produccion_by_category', { anio: filters.anio, mes: filters.mes });
  const productos = useFetch('/costos/get_produccion_by_productos', { anio: filters.anio, mes: filters.mes });
  const insumosSemana = useFetch('/costos/get_insumos_by_month', { anio: filters.anio, mes: filters.mes, semana: filters.semana, by_week: 'yes' });
  const insumosMes = useFetch('/costos/get_insumos_by_month', { anio: filters.anio, mes: filters.mes, by_week: 'no' });

  const semanaRef = useRef(null);
  const mesRef = useRef(null);
  const printSemana = useReactToPrint({ contentRef: semanaRef });
  const printMes = useReactToPrint({ contentRef: mesRef });

  const applyFilters = () => {
    categoria.refetch({ anio: filters.anio, mes: filters.mes });
    productos.refetch({ anio: filters.anio, mes: filters.mes });
    insumosSemana.refetch({ anio: filters.anio, mes: filters.mes, semana: filters.semana, by_week: 'yes' });
    insumosMes.refetch({ anio: filters.anio, mes: filters.mes, by_week: 'no' });
  };

  const loading = categoria.loading || productos.loading || insumosSemana.loading || insumosMes.loading;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Producción</div>
          <div className="page-subtitle">Producción planificada vs. real</div>
        </div>
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
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group field-w-md">
            <label className="form-label">Semana</label>
            <select className="form-select" value={filters.semana} onChange={e => setFilters(f => ({ ...f, semana: Number(e.target.value) }))}>
              {SEMANAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={applyFilters}>Aplicar Filtros</button>
          </div>
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3 className="card-title">Producción por Categoría</h3></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Categoría</th><th>Planeado</th><th>Producido</th><th>Vendido</th><th>% Ejecutado</th><th>% Vendido</th></tr></thead>
                <tbody>
                  {(categoria.data || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.categoria}</td><td>{r.planeado}</td><td>{r.producido}</td><td>{r.vendido}</td>
                      <td>{formatPercent(r.porcentaje_ejecutado)}</td><td>{formatPercent(r.porcentaje_vendido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3 className="card-title">Producción por Productos</h3></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Categoría</th><th>Producto</th><th>Planeado</th><th>Producido</th><th>Vendido</th><th>% Ejecutado</th><th>% Vendido</th></tr></thead>
                <tbody>
                  {(productos.data || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.categoria}</td><td>{r.producto}</td><td>{r.planeado}</td><td>{r.producido}</td><td>{r.vendido}</td>
                      <td>{formatPercent(r.porcentaje_ejecutado)}</td><td>{formatPercent(r.porcentaje_vendido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3 className="card-title">Insumos Previstos por Semana</h3>
              <button className="btn btn-secondary btn-sm no-print" onClick={printSemana}><Printer size={14} /> Imprimir</button>
            </div>
            <div className="table-container" ref={semanaRef}>
              <table>
                <thead><tr><th>Semana</th><th>Insumo</th><th>Plan</th><th>Usado</th><th>Plan $</th><th>Usado $</th></tr></thead>
                <tbody>
                  {(insumosSemana.data || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.semana}</td><td>{r.insumo}</td><td>{r.plan}</td><td>{r.usado}</td>
                      <td>{formatCurrencyARS(r.plan_precio)}</td><td>{formatCurrencyARS(r.usado_precio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Insumos Previstos Mensual</h3>
              <button className="btn btn-secondary btn-sm no-print" onClick={printMes}><Printer size={14} /> Imprimir</button>
            </div>
            <div className="table-container" ref={mesRef}>
              <table>
                <thead><tr><th>Mes</th><th>Insumo</th><th>Plan</th><th>Usado</th><th>Plan $</th><th>Usado $</th></tr></thead>
                <tbody>
                  {(insumosMes.data || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.mes}</td><td>{r.insumo}</td><td>{r.plan}</td><td>{r.usado}</td>
                      <td>{formatCurrencyARS(r.plan_precio)}</td><td>{formatCurrencyARS(r.usado_precio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
