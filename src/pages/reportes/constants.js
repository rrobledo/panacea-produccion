import { recentYears } from '../../utils/years';

export const ANIOS = recentYears();

export const MESES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export const MESES_CON_TODOS = [{ value: 0, label: 'Todos' }, ...MESES];

export const SEMANAS = [0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: n === 0 ? 'Todas' : `Semana ${n}` }));
