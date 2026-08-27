export const ESTADO_LABELS = {
  ASIGNADA: 'Asignada',
  EN_PRODUCCION: 'En Producción',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const ESTADO_BADGE = {
  ASIGNADA: 'warning',
  EN_PRODUCCION: 'primary',
  FINALIZADA: 'success',
  CANCELADA: 'danger',
};

export const ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }));
