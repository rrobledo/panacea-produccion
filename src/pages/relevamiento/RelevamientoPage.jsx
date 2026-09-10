import { useNavigate } from 'react-router-dom';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import { DataGrid } from '../../components/grid/DataGrid';
import { useFetch } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';

// El avance del relevamiento de gramajes. Es el camino crítico del cambio de
// motor: el gramaje no está en ninguna tabla del modelo viejo y no se puede
// deducir — `producto_base_id` dice de qué masa sale un producto, nunca cuánta
// consume. Ver openspec/changes/masa-procesos-y-maquinaria/design.md, F3.

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

export const RelevamientoPage = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch('/costos/procesos/pendientes-relevamiento');

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const columns = [
    { accessorKey: 'proceso_codigo', header: 'Proceso' },
    { accessorKey: 'proceso_nombre', header: 'Nombre' },
    { accessorKey: 'producto_nombre', header: 'Rama sin gramaje' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/relevamiento/${row.original.proceso_id}`)}>
          Cargar gramajes
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Relevamiento de Gramajes</div>
          <div className="page-subtitle">
            Cuánta masa consume cada bollo. Sin este dato el sistema no puede calcular cuánto amasar.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div>
              <div className="page-subtitle">Ramas relevadas</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {data.lineas_completas} / {data.lineas_totales}
              </div>
            </div>
            <div>
              <div className="page-subtitle">Masas pendientes</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{data.procesos_pendientes}</div>
            </div>
            <div>
              <div className="page-subtitle">Avance</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{data.porcentaje} %</div>
            </div>
          </div>
          <Barra porcentaje={data.porcentaje} />
        </div>
      </div>

      {data.lineas_pendientes === 0 ? (
        <EmptyState
          title="Relevamiento completo"
          description="Todas las ramas que se cuentan por unidad tienen su gramaje cargado. Ya se puede comparar los dos motores por fecha."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/relevamiento/comparar')}>Ir a la comparación</button>}
        />
      ) : (
        <DataGrid
          columns={columns} data={data.pendientes} title="Pendientes"
          emptyText="Sin pendientes"
        />
      )}
    </div>
  );
};
