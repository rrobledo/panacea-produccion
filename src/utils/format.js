export const formatCurrencyARS = (value) => {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

export const formatPercent = (value) => {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
};
