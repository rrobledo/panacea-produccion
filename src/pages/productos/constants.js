export const CATEGORIAS = [
  { value: 'ALFAJORES', label: 'Alfajores' },
  { value: 'BOLLERIA', label: 'Bollería' },
  { value: 'BUDINES', label: 'Budines' },
  { value: 'CUADRADOS', label: 'Cuadrados' },
  { value: 'FACTURAS', label: 'Facturas' },
  { value: 'GALLETAS', label: 'Galletas' },
  { value: 'PANADERIA', label: 'Panadería' },
  { value: 'PASTAS', label: 'Pastas' },
  { value: 'PASTELERIA', label: 'Pastelería' },
  { value: 'PIZZAS', label: 'Pizzas' },
];

// KG existe para los productos que se venden por peso — el pan francés es el
// caso testigo. Los insumos ya lo tenían; los productos no, así que un producto
// vendido por kilo no se podía expresar en su unidad natural. Ver
// openspec/changes/masa-procesos-y-maquinaria/ (F1, task 1.2).
export const UNIDADES_MEDIDA_PRODUCTO = [
  { value: 'GR', label: 'Gramos' },
  { value: 'KG', label: 'Kilos' },
  { value: 'UN', label: 'Unidades' },
];

// Campos de artículo (masa-procesos-y-maquinaria). `naturaleza` reemplaza al
// booleano `is_producto`, que no podía expresar que algo se venda Y sea
// componente de otro; `unidad_base` dice cómo se cuenta el stock y se factura,
// que es una pregunta distinta de en qué unidad está escrita la receta.
export const NATURALEZAS = [
  { value: 'INSUMO', label: 'Insumo' },
  { value: 'SEMIELABORADO', label: 'Semielaborado (masa)' },
  { value: 'TERMINADO', label: 'Terminado' },
  { value: 'RESIDUO', label: 'Residuo' },
];

export const UNIDADES_BASE = [
  { value: 'KG', label: 'Kilos' },
  { value: 'UN', label: 'Unidades' },
  { value: 'LT', label: 'Litros' },
];
