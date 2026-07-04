## Why

Today, creating a new Producto or Factura/Gasto only lets you fill in the master record's fields — the nested detail sections (Costos del Producto, Detalle de Insumos) only appear once you save and reopen the record in Edit mode. A user has to create the header first, then navigate back into it as a separate step just to add the lines they already knew about while filling the form. `../panacea-mayorista`'s Remito CRUD demonstrates the pattern we want instead: the "new remito" screen collects the header (cliente, fecha, vendedor) *and* the line items in one screen, and a single "Registrar Remito" action submits everything together in one request. We should do the same wherever the backend supports it, and get as close to it as possible where it doesn't.

## What Changes

- Add a "Costos del Producto" section to the Producto **create** page, letting the user stage bill-of-materials lines before the producto exists. On submit: create the producto first (its id doesn't exist until then), then persist every staged cost line against that new id, reporting one combined result — this is the closest a single "Guardar" can get to Remito's one-shot save, since `POST /costos/productos/{id}/costos` has no bulk variant and needs a real producto id.
- Add a "Detalle de Insumos" section to the Factura/Gasto **create** page, letting the user stage insumo line items before the factura exists. On submit: the staged lines are embedded directly in the same `POST /costos/ctacteprov` request as the master fields — a true single-request save, matching Remito exactly, since the backend's `CuentaCorrienteProveedorCreate` schema already accepts an inline `insumos` array.
- Extract the presentational parts (line-items table + add modal) of `ProductoCostosDetail` and `FacturaInsumosDetail` (built in the `batch-save-master-detail` change) into shared components reused by both the existing Edit sections (network-backed, staged-then-committed) and the new Create sections (purely local until the master form submits).
- **Not changed**: Facturas/Gastos' Pagos section stays Edit-only. A payment references its parent factura's id (`factura_id`) and the backend has no way to create a factura and its payments in the same request — you cannot pay an invoice that doesn't exist yet, so there's no create-time equivalent here.
- **Not changed**: the Edit-time behavior from `batch-save-master-detail` (stage locally, commit via dedicated sub-resource endpoints on save) — this change only adds equivalent capability to the Create pages.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `productos`: "Create Producto" gains a Costos del Producto section, staged locally and persisted right after the producto itself is created.
- `facturas-gastos`: "Create Factura/Gasto" gains a Detalle de Insumos section, staged locally and submitted embedded in the same create request as the master fields.

## Impact

- **Affected code**: `src/pages/productos/ProductoCreatePage.jsx`, `src/pages/facturas/FacturaCreatePage.jsx`, new shared presentational components extracted from `ProductoCostosDetail`/`FacturaInsumosDetail`, reusing the existing `useStagedList` hook and `EntityPicker` from `batch-save-master-detail`.
- **Backend**: no backend changes. Uses `POST /costos/productos` then `POST /costos/productos/{id}/costos` (multiple calls, sequenced behind one user action) for Productos; a single `POST /costos/ctacteprov` with an embedded `insumos` array for Facturas/Gastos.
- **Reference**: `../panacea-mayorista`'s `RemitosPage.jsx` (create) and `RemitoDetailPage.jsx` (edit) are the model for this pattern — collect master + detail in one screen, submit once. Its backend happens to support a full nested-array save on both create *and* update; ours only confirmed-supports it on create for `ctacteprov`, which is why this change is create-only and the existing Edit-time sub-resource approach from `batch-save-master-detail` is left as-is.
