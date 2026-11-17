import { useMemo, useState } from 'react';
import { DataGrid } from '../../components/grid/DataGrid';
import { PageLoader, ErrorState, Select } from '../../components/ui';
import { useFetch } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';
import { ReferenciaEditorModal } from './ReferenciaEditorModal';
import { ESTADO_OPTIONS, SUCURSAL_LABEL, SUCURSAL_OPTIONS } from './constants';

// Vincula lo que se vende en las sucursales (artículos de caja, vista
// `articulos_final`) con lo que se fabrica (`costos_productos`), vía
// `costos_productosref`. Un artículo sin relación no llega como producto a
// `panacea_sales_v2` y los reportes lo pierden sin avisar; por eso la pantalla
// abre en Pendientes. Ver openspec/changes/referencias-articulos-sucursales.

const URL = '/costos/referencias-articulos';

const Barra = ({ porcentaje }) => (
  <div style={{ background: 'var(--gray-200)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
    <div
      style={{
        width: `${porcentaje}%`, height: '100%',
        background: porcentaje === 100 ? 'var(--success, #1B5A44)' : 'var(--primary)',
        transition: 'width .3s',
      }}
    />
  </div>
);

const Indicador = ({ titulo, valor }) => (
  <div>
    <div className="page-subtitle">{titulo}</div>
    <div style={{ fontSize: 24, fontWeight: 600 }}>{valor}</div>
  </div>
);

const limpiar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));

export const ReferenciasArticulosPage = () => {
  const [filtros, setFiltros] = useState({ estado: 'pendiente', sucursal: '', categoria: '' });
  const [editando, setEditando] = useState(null);

  const params = limpiar(filtros);
  const { data, loading, error, refetch } = useFetch(URL, params, [JSON.stringify(params)]);

  // Las categorías salen de todos los artículos activos, no del listado
  // filtrado: si no, al elegir una categoría desaparecerían las demás.
  const { data: todos } = useFetch(URL, { estado: 'todos' });
  const categorias = useMemo(
    () => [...new Set((todos?.items || []).map(i => i.categoria).filter(Boolean))].sort(),
    [todos]
  );

  const setFiltro = (campo) => (valor) => setFiltros(f => ({ ...f, [campo]: valor }));

  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  // El loader de página sólo en la primera carga: al cambiar un filtro la
  // grilla muestra su propio spinner y los filtros no se desmontan.
  if (!data) return <PageLoader />;

  const { resumen, items } = data;
  const porcentaje = resumen.total ? Math.round((resumen.vinculados * 100) / resumen.total) : 0;

  const columns = [
    { accessorKey: 'idarticulo', header: 'Id' },
    { accessorKey: 'nombre', header: 'Artículo' },
    { accessorKey: 'categoria', header: 'Categoría' },
    { accessorKey: 'sucursal', header: 'Sucursal', cell: ({ getValue }) => SUCURSAL_LABEL[getValue()] ?? getValue() },
    {
      accessorKey: 'precio', header: 'Precio',
      cell: ({ getValue }) => (getValue() != null ? `$${Number(getValue()).toLocaleString('es-AR')}` : ''),
    },
    {
      id: 'productos', header: 'Productos vinculados',
      accessorFn: (row) => row.relaciones.map(r => `${r.producto_nombre ?? `#${r.producto_id}`} × ${r.unidad_conversion}`).join(', '),
    },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => (
        <span className={`badge badge-${getValue() === 'vinculado' ? 'success' : 'warning'}`}>
          {getValue() === 'vinculado' ? 'Vinculado' : 'Pendiente'}
        </span>
      ),
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => setEditando(row.original)}>
          {row.original.estado === 'vinculado' ? 'Editar' : 'Vincular'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Referencias de Sucursales</div>
          <div className="page-subtitle">
            Qué producto fabricado corresponde a cada artículo que se vende en las sucursales
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div className="form-row" style={{ marginBottom: 12 }}>
            <Indicador
              titulo={`Artículos vinculados${filtros.sucursal ? ` · ${SUCURSAL_LABEL[filtros.sucursal]}` : ''}`}
              valor={`${resumen.vinculados} / ${resumen.total}`}
            />
            <Indicador titulo="Pendientes" valor={resumen.pendientes} />
            <Indicador titulo="Avance" valor={`${porcentaje} %`} />
          </div>
          <Barra porcentaje={porcentaje} />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={items}
        loading={loading}
        rowKey="idarticulo"
        title="Artículos de caja"
        emptyText={filtros.estado === 'pendiente' ? 'No hay artículos pendientes de vincular' : 'Sin artículos'}
        actions={
          <div className="flex items-center gap-2">
            <Select options={ESTADO_OPTIONS} value={filtros.estado} onChange={setFiltro('estado')} placeholder={null} />
            <Select options={SUCURSAL_OPTIONS} value={filtros.sucursal} onChange={setFiltro('sucursal')} placeholder="Sucursal: Todas" />
            <Select options={categorias} value={filtros.categoria} onChange={setFiltro('categoria')} placeholder="Categoría: Todas" />
          </div>
        }
      />

      {editando && (
        <ReferenciaEditorModal
          key={editando.idarticulo}
          articulo={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); refetch(); }}
        />
      )}
    </div>
  );
};
