import { useState } from 'react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, Modal } from '../../components/ui';
import { MovimientosStockTable } from '../insumos/MovimientosStockTable';
import { useList, useFetch } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';

// Stock de semielaborados: la masa que se amasó de más queda con saldo y una
// orden posterior la puede consumir antes de volver a amasar. Ver
// openspec/changes/masa-procesos-y-maquinaria/design.md D4 y D5.
//
// El disponible se deriva del ledger, no es un campo editable: no hay nada que
// mantener sincronizado y por lo tanto nada que se pueda desincronizar. Por eso
// esta pantalla no tiene "Ajustar stock" como la de insumos.

const NATURALEZAS = [
  { value: 'SEMIELABORADO', label: 'Semielaborados' },
  { value: 'TERMINADO', label: 'Terminados' },
];

// Se monta sólo cuando hay un artículo elegido: `useFetch` dispara el GET al
// montar y no contempla una url nula.
const DetalleMovimientos = ({ producto, onClose }) => {
  const { data, loading } = useFetch(`/costos/articulos/${producto.producto_id}/movimientos`);

  return (
    <Modal open onClose={onClose} title={`Movimientos de ${producto.producto_nombre}`} size="lg">
      <>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div>
              <div className="page-subtitle">Disponible</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {(data?.disponible ?? producto.disponible)} {producto.unidad_base}
              </div>
            </div>
            <div>
              <div className="page-subtitle">Comprometido</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {(data?.comprometido ?? producto.comprometido)} {producto.unidad_base}
              </div>
            </div>
          </div>
          <MovimientosStockTable movimientos={data?.movimientos} loading={loading} />
      </>
    </Modal>
  );
};

export const StockArticulosPage = () => {
  const [naturaleza, setNaturaleza] = useState('SEMIELABORADO');
  const [detalle, setDetalle] = useState(null);
  const { items, loading, error, refetch } = useList(`/costos/articulos?naturaleza=${naturaleza}`);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'producto_nombre', header: 'Artículo' },
    { accessorKey: 'unidad_base', header: 'Unidad' },
    {
      id: 'disponible', header: 'Disponible',
      cell: ({ row }) => `${row.original.disponible} ${row.original.unidad_base}`,
    },
    {
      id: 'comprometido', header: 'Comprometido',
      cell: ({ row }) => `${row.original.comprometido} ${row.original.unidad_base}`,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(row.original)}>
          Ver movimientos
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Stock de Artículos</div>
          <div className="page-subtitle">
            Saldo derivado de lo que las órdenes fabricaron y de lo que otros procesos consumieron
          </div>
        </div>
        <select className="form-select" style={{ width: 200 }} value={naturaleza} onChange={e => setNaturaleza(e.target.value)}>
          {NATURALEZAS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
        </select>
      </div>

      <DataGrid
        columns={columns} data={items} loading={loading} title="Stock"
        emptyText="No hay artículos con stock en esta categoría"
      />

      {detalle && <DetalleMovimientos producto={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
};
