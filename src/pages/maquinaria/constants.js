// Cada máquina se mide en lo suyo: la amasadora en kilos por bacha, el horno en
// carros o bandejas, la cámara en carros simultáneos. Una sola columna de
// capacidad sin unidad no alcanza, y además la unidad decide el modo de
// ocupación. Ver openspec/changes/masa-procesos-y-maquinaria/design.md D11.

export const TIPOS_MAQUINA = [
  { value: 'AMASADORA', label: 'Amasadora' },
  { value: 'SOBADORA', label: 'Sobadora' },
  { value: 'DIVISORA', label: 'Divisora' },
  { value: 'LAMINADORA', label: 'Laminadora' },
  { value: 'BATIDORA', label: 'Batidora' },
  { value: 'CAMARA', label: 'Cámara de fermentación' },
  { value: 'HORNO', label: 'Horno' },
  { value: 'MESA', label: 'Mesa de trabajo' },
];

export const UNIDADES_CAPACIDAD = [
  { value: 'KG', label: 'Kilos por bacha', concurrente: false },
  { value: 'LITROS', label: 'Litros por bacha', concurrente: false },
  { value: 'KG_HORA', label: 'Kilos por hora', concurrente: false },
  { value: 'CARROS', label: 'Carros simultáneos', concurrente: true },
  { value: 'BANDEJAS', label: 'Bandejas simultáneas', concurrente: true },
];

export const ESTADOS_MAQUINA = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'MANTENIMIENTO', label: 'En mantenimiento' },
  { value: 'BAJA', label: 'De baja' },
];

export const AREAS = ['Panaderia', 'Pasteleria', 'Pastas', 'Galletas', 'Todos'];

export const ESTADO_CARGA = {
  HOLGADO: { label: 'Holgado', badge: 'success' },
  AJUSTADO: { label: 'Ajustado', badge: 'warning' },
  CUELLO_DE_BOTELLA: { label: 'Cuello de botella', badge: 'warning' },
  SOBRECAPACIDAD: { label: 'Sobrecapacidad', badge: 'danger' },
};

export const tipoLabel = (v) => TIPOS_MAQUINA.find(t => t.value === v)?.label ?? v;
export const estadoLabel = (v) => ESTADOS_MAQUINA.find(e => e.value === v)?.label ?? v;
