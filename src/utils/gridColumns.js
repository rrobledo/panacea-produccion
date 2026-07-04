/**
 * Flattens the backend's ag-Grid-style nested column-group tree
 * (`{ headerName, children: [...] }`) into the flat leaf-column list
 * `EditableGrid` expects, prefixing each leaf's header with its immediate
 * parent group's label (e.g. "Enero Corr") so same-named columns across
 * different months/groups stay distinguishable.
 *
 * Leaf nodes without a `field` (e.g. computed `valueGetter` columns like
 * "Semanal") are dropped — they have no backing row key to read/write.
 */
export const flattenColumns = (nodes, parentLabel = '') => {
  const result = [];
  for (const node of nodes || []) {
    if (node.hide) continue;
    if (node.children) {
      result.push(...flattenColumns(node.children, node.headerName || parentLabel));
      continue;
    }
    if (!node.field) continue;
    const header = parentLabel ? `${parentLabel} ${node.headerName || node.field}` : (node.headerName || node.field);
    result.push({ field: node.field, header, editable: !!node.editable, type: 'number' });
  }
  return result;
};

/** Backend column defs carry no type hint, so infer text vs number from sampled row data. */
export const inferColumnTypes = (columns, rows) => columns.map(col => {
  const sample = rows.find(r => r[col.field] != null)?.[col.field];
  return { ...col, type: typeof sample === 'string' ? 'text' : 'number' };
});
