export const MESES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export const SEMANAS = [0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: n === 0 ? 'Todas' : `Semana ${n}` }));

export const RESPONSABLES = [
  { value: '', label: 'Todos' },
  { value: 'Pasteleria', label: 'Pasteleria' },
  { value: 'Pastas', label: 'Pastas' },
  { value: 'Panaderia', label: 'Panaderia' },
  { value: 'Galletas', label: 'Galletas' },
];
