// Derivada en el backend del rango de `idarticulo` de la vista
// `articulos_final`: VA < 2000, CP 2000–3999, CBA >= 4000.
export const SUCURSAL_LABEL = { VA: 'Villa Allende', CP: 'Carlos Paz', CBA: 'Córdoba' };

export const SUCURSAL_OPTIONS = Object.entries(SUCURSAL_LABEL).map(([value, label]) => ({ value, label }));

export const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'vinculado', label: 'Vinculados' },
  { value: 'todos', label: 'Todos' },
];
