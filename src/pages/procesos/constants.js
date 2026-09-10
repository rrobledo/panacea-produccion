// El grafo de procesos: un proceso toma N artículos y devuelve M artículos, y
// la salida de uno puede ser la entrada de otro. Ver
// openspec/changes/masa-procesos-y-maquinaria/design.md D2.

export const TIPOS_PROCESO = [
  { value: 'ELABORACION', label: 'Elaboración', hint: 'Insumos → semielaborado. Es la receta de la masa.' },
  { value: 'DIVISION', label: 'División', hint: 'Semielaborado → varios terminados, cada uno con su gramaje.' },
  { value: 'TRANSFORMACION', label: 'Transformación', hint: 'Semielaborado + insumos → otro semielaborado.' },
  { value: 'FRACCIONAMIENTO', label: 'Fraccionamiento', hint: 'Un terminado → varios terminados más un residuo.' },
];

export const ROLES_LINEA = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SALIDA', label: 'Salida' },
  { value: 'COPRODUCTO', label: 'Coproducto' },
  { value: 'RESIDUO', label: 'Residuo' },
];

export const ROLES_SALIDA = ['SALIDA', 'COPRODUCTO'];

export const UNIDADES_LOTE = [
  { value: 'KG', label: 'Kilos' },
  { value: 'UN', label: 'Unidades' },
  { value: 'LT', label: 'Litros' },
];

export const CRITERIOS_REPARTO = [
  { value: 'PESO', label: 'Por peso' },
  { value: 'VALOR', label: 'Por valor de venta' },
];

export const tipoLabel = (value) => TIPOS_PROCESO.find(t => t.value === value)?.label ?? value;
export const rolLabel = (value) => ROLES_LINEA.find(r => r.value === value)?.label ?? value;
