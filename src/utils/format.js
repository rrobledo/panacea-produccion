export const formatCurrencyARS = (value) => {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

export const formatPercent = (value) => {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
};

/**
 * Cantidad de insumo de una Orden de Producción, siempre entera.
 *
 * Producción no maneja fracciones. Desde `preview-generacion-ordenes` el
 * backend ya persiste estas cantidades redondeadas, pero las órdenes
 * generadas antes de ese cambio conservan sus decimales guardados: se
 * redondean acá al mostrarlas, sin tocar el valor almacenado.
 */
export const formatCantidadInsumo = (value) =>
  Math.round(Number(value ?? 0)).toLocaleString('es-AR');
