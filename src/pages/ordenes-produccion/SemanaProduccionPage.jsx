import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, addWeeks, format, isValid, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { PageLoader, ErrorState } from '../../components/ui';
import { useFetch } from '../../hooks';
import { getErrorMessage } from '../../utils/errorMessage';
import { ESTADO_BADGE, ESTADO_LABELS } from './constants';

// La semana de negocio del proyecto es lunes a sábado: la Programación
// construye sus días con `weekday() != 6`, o sea excluye solo el domingo.
// El domingo acá es una columna condicional (ver design.md Decision 2).
const LUNES = 1;

// Clave de día: SIEMPRE string 'YYYY-MM-DD'. El backend devuelve
// `fecha_fabricacion` con ese formato y se compara tal cual, sin construir un
// Date: `new Date('2026-09-08')` se interpreta como UTC y en UTC-3 retrocede
// un día, que es la forma clásica de que una orden caiga en la columna
// equivocada (design.md Decision 3).
const clave = (fecha) => format(fecha, 'yyyy-MM-dd');

const lunesDe = (fecha) => startOfWeek(fecha, { weekStartsOn: LUNES });

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const SemanaProduccionPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const lunesDeHoy = useMemo(() => lunesDe(new Date()), []);

  // La semana se identifica por su lunes en la URL. Una fecha concreta y no un
  // número ISO: el año ISO no coincide con el calendario en la última semana de
  // diciembre (design.md Decision 1). Un valor que no parsee cae a esta semana.
  const lunes = useMemo(() => {
    const raw = searchParams.get('semana');
    if (!raw) return lunesDeHoy;
    const parsed = parseISO(raw);
    return isValid(parsed) ? lunesDe(parsed) : lunesDeHoy;
  }, [searchParams, lunesDeHoy]);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes]);
  const domingo = dias[6];
  const esSemanaActual = clave(lunes) === clave(lunesDeHoy);
  const hoyClave = clave(new Date());

  // Un solo fetch por semana: son a lo sumo unas decenas de órdenes, y siete
  // llamadas multiplicarían latencia y estados de carga sin ganar nada. Se pide
  // hasta el domingo para no perder las órdenes de ese día.
  const params = useMemo(
    () => ({ fecha_desde: clave(lunes), fecha_hasta: clave(domingo) }),
    [lunes, domingo]
  );
  const { data, loading, error, refetch } = useFetch(
    '/costos/ordenes-produccion',
    params,
    [params.fecha_desde]
  );

  const porDia = useMemo(() => {
    const ordenes = data || [];
    const mapa = {};
    for (const dia of dias) mapa[clave(dia)] = [];
    for (const orden of ordenes) {
      // Comparación de strings, sin Date de por medio.
      const k = orden.fecha_fabricacion;
      if (mapa[k]) mapa[k].push(orden);
    }
    // Orden estable dentro del día, para que el tablero no cambie entre recargas.
    for (const k of Object.keys(mapa)) {
      mapa[k].sort((a, b) => a.codigo.localeCompare(b.codigo));
    }
    return mapa;
  }, [data, dias]);

  // Lunes a sábado siempre; domingo solo si tiene órdenes (Decision 2).
  const columnas = useMemo(() => {
    const base = dias.slice(0, 6);
    return porDia[clave(domingo)]?.length > 0 ? [...base, domingo] : base;
  }, [dias, domingo, porDia]);

  const totalSemana = (data || []).length;

  const irA = (nuevoLunes) => setSearchParams({ semana: clave(nuevoLunes) }, { replace: true });

  const rango = `${format(lunes, "d 'de' MMMM", { locale: es })} – ${format(dias[6], "d 'de' MMMM 'de' yyyy", { locale: es })}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Semana de Producción</div>
          <div className="page-subtitle flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span>{rango}</span>
            {esSemanaActual && <span className="badge badge-primary">Semana actual</span>}
            {!loading && !error && (
              <span className="text-gray">
                · {totalSemana} {totalSemana === 1 ? 'orden' : 'órdenes'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => irA(addWeeks(lunes, -1))}>
            <ChevronLeft size={14} /> Anterior
          </button>
          {!esSemanaActual && (
            <button className="btn btn-secondary btn-sm" onClick={() => irA(lunesDeHoy)}>
              <CalendarDays size={14} /> Esta semana
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => irA(addWeeks(lunes, 1))}>
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch(params)} />
      ) : (
        <>
          {totalSemana === 0 && (
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              Esta semana no tiene órdenes de producción.
            </div>
          )}

          <div className="table-container" style={{ paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 900 }}>
              {columnas.map(dia => {
                const k = clave(dia);
                const ordenes = porDia[k] || [];
                const esHoy = k === hoyClave;
                return (
                  <div
                    key={k}
                    className="card"
                    style={{
                      flex: '1 1 0', minWidth: 190, marginBottom: 0,
                      borderTop: esHoy ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                  >
                    <div className="card-header" style={{ padding: '12px 14px' }}>
                      <div>
                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                          {capitalizar(format(dia, 'EEEE', { locale: es }))}
                          {esHoy && <span className="badge badge-primary" style={{ marginLeft: 6 }}>Hoy</span>}
                        </div>
                        <div className="text-sm text-gray">{format(dia, 'd MMM', { locale: es })}</div>
                      </div>
                      <span className="badge badge-gray">{ordenes.length}</span>
                    </div>

                    <div className="card-body" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ordenes.length === 0 ? (
                        <div className="text-sm text-gray text-center" style={{ padding: '16px 0' }}>
                          Sin órdenes
                        </div>
                      ) : (
                        ordenes.map(orden => (
                          <OrdenCard key={orden.id} orden={orden} onOpen={() => navigate(`/ordenes-produccion/${orden.id}`)} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Es un <button> y no un <div onClick>: la tarjeta es la única forma de llegar
// al detalle desde esta pantalla, así que tiene que ser alcanzable con Tab y
// accionable con Enter (design.md Decision 6).
const OrdenCard = ({ orden, onOpen }) => {
  const productos = orden.productos.map(p => p.producto?.nombre).filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'var(--white)', border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius)', padding: 10, font: 'inherit',
      }}
    >
      {/* El badge baja de línea si no entra, en vez de partir el código al medio. */}
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{orden.codigo}</span>
        <span className={`badge badge-${ESTADO_BADGE[orden.estado] || 'gray'}`}>
          {ESTADO_LABELS[orden.estado] || orden.estado}
        </span>
      </div>
      <div className="text-sm text-gray">{orden.responsable}</div>
      {productos && <div className="text-sm" style={{ marginTop: 4 }}>{productos}</div>}
    </button>
  );
};
