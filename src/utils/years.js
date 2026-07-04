/** Rolling year options ending at the current year, so pickers never go stale. */
export const recentYears = (span = 3) => {
  const y = new Date().getFullYear();
  return Array.from({ length: span }, (_, i) => y - (span - 1) + i);
};
