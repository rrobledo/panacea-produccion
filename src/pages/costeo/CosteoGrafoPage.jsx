import { useState } from 'react';
import { PageLoader, ErrorState, Modal } from '../../components/ui';
import { DataGrid } from '../../components/grid/DataGrid';
import { useFetch } from '../../hooks';
import { formatCurrencyARS } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

// El costo en dos capas: la primera pertenece a la masa y se comparte, la
// segunda a cada rama y no. Esa separación es la que hace que dos productos de
// la misma masa no terminen costando lo mismo. Ver design.md §05 y D14.

const Detalle = ({ articulo, onClose }) => {
  const { data, loading } = useFetch(`/costos/costeo-grafo/${articulo.articulo_id}`);

  return (
    <Modal open onClose={onClose} title={`Costo de ${articulo.nombre}`} size="lg">
      {loading ? <PageLoader /> : data && (
        <>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div>
              <div className="page-subtitle">Insumos y semielaborados</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrencyARS(data.costo_insumos)}</div>
            </div>
            <div>
              <div className="page-subtitle">Mano de obra</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrencyARS(data.costo_mano_obra)}</div>
            </div>
            <div>
              <div className="page-subtitle">Máquina</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrencyARS(data.costo_maquina)}</div>
            </div>
            <div>
              <div className="page-subtitle">Costo unitario</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {formatCurrencyARS(data.costo_unitario)} / {data.unidad_base}
              </div>
            </div>
          </div>

          {data.pendientes?.length > 0 && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--warning, #B26B15)' }}>
              <div className="card-body">
                <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                  {data.pendientes.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><h3 className="card-title">Composición</h3></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Concepto</th><th>Cantidad</th><th>Importe</th><th>% del total</th></tr>
                </thead>
                <tbody>
                  {data.detalle.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge badge-${d.tipo === 'SEMIELABORADO' ? 'warning' : 'gray'}`}>
                          {d.tipo === 'SEMIELABORADO' ? 'Semielaborado' : 'Insumo'}
                        </span>
                      </td>
                      <td>{d.nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>{formatCurrencyARS(d.importe)}</td>
                      <td>{data.costo_total ? ((d.importe / data.costo_total) * 100).toFixed(1) : 0} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export const CosteoGrafoPage = () => {
  const [detalle, setDetalle] = useState(null);
  const { data, loading, error, refetch } = useFetch('/costos/costeo-grafo');

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'nombre', header: 'Artículo' },
    { accessorKey: 'unidad_base', header: 'Unidad' },
    { id: 'mp', header: 'Insumos', cell: ({ row }) => formatCurrencyARS(row.original.costo_insumos) },
    { id: 'mo', header: 'Mano de obra', cell: ({ row }) => formatCurrencyARS(row.original.costo_mano_obra) },
    { id: 'maq', header: 'Máquina', cell: ({ row }) => formatCurrencyARS(row.original.costo_maquina) },
    {
      id: 'unitario', header: 'Costo unitario',
      cell: ({ row }) => (
        <strong>{formatCurrencyARS(row.original.costo_unitario)}</strong>
      ),
    },
    {
      id: 'estado', header: '',
      cell: ({ row }) => row.original.pendientes?.length > 0
        ? <span className="badge badge-warning" title={row.original.pendientes.join(' · ')}>Incompleto</span>
        : null,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(row.original)}>Ver detalle</button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Costeo por Capas</div>
          <div className="page-subtitle">
            La masa por kilo, más el tiempo y el horno propios de cada rama
          </div>
        </div>
      </div>

      <DataGrid columns={columns} data={data || []} title="Costos" emptyText="No hay artículos costeables" />

      {detalle && <Detalle articulo={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
};
