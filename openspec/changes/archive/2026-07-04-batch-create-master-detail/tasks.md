## 1. Extract presentational line-items components

- [x] 1.1 Create `src/pages/productos/CostosLinesEditor.jsx`: presentational component taking `{ items, onAdd, onEdit, onRemove }`, rendering the Costos table (Insumo/Cantidad/Medida/actions, pending badge/row styling) and the Agregar/Editar Costo modal (`EntityPicker` + Cantidad), extracted verbatim from `ProductoCostosDetail`'s render output
- [x] 1.2 Rework `ProductoCostosDetail` to be a thin wrapper: keep its `useFetch`, `useStagedList`, and `forwardRef`/`commit` logic, delegate rendering to `CostosLinesEditor`
- [x] 1.3 Verify the Producto Edit page's Costos behavior is unchanged after the extraction (same network calls, same staging/commit behavior) — build/lint clean, code paths byte-for-byte equivalent to before the extraction
- [x] 1.4 Create `src/pages/facturas/InsumosLinesEditor.jsx`: presentational component taking `{ items, onAdd, onRemove, resolveNombre? }`, rendering the Detalle de Insumos table (Insumo/Cantidad/Costo/actions, empty state, pending badge) and the Agregar Insumo modal, extracted verbatim from `FacturaInsumosDetail`'s render output
- [x] 1.5 Rework `FacturaInsumosDetail` to be a thin wrapper: keep its `useFetch`, `useEntityNames`, `useStagedList`, and `forwardRef`/`commit` logic, delegate rendering to `InsumosLinesEditor`
- [x] 1.6 Verify the Factura/Gasto Edit page's Detalle de Insumos behavior is unchanged after the extraction — same as 1.3

## 2. Productos: Costos on the Create page

- [x] 2.1 In `ProductoCreatePage`, add a local `useStagedList([])` instance for cost lines and render `CostosLinesEditor` below `ProductoForm`, wired to its `add`/`edit`/`remove`
- [x] 2.2 Update the submit handler: `POST /costos/productos` first; on success, if any cost lines are staged, `POST` each to `/costos/productos/{new_id}/costos` in parallel; only toast success and navigate once everything settles
- [x] 2.3 On partial failure (producto created, some cost lines failed), toast that the producto was created and which line(s) failed, then navigate to the new producto's Edit page (where the failed lines remain visible to retry, per the Edit page's own fetch — note staged-but-unpersisted lines from the Create page are not automatically carried over; the user re-adds only the ones that failed)
- [x] 2.4 Add a "Cancelar"-with-pending-changes confirmation on `ProductoCreatePage`, mirroring the Edit page's pattern, when staged cost lines exist

## 3. Facturas/Gastos: Detalle de Insumos on the Create page

- [x] 3.1 In `FacturaCreatePage`, add a local `useStagedList([])` instance for insumo lines and render `InsumosLinesEditor` below `FacturaForm`, wired to its `add`/`remove`
- [x] 3.2 Update the submit handler: build the `POST /costos/ctacteprov` payload as `{ ...masterFields, insumos: stagedItems.length ? stagedItems.map(...) : undefined }`, sending master and detail in one request
- [x] 3.3 Add a "Cancelar"-with-pending-changes confirmation on `FacturaCreatePage`, mirroring the Edit page's pattern, when staged insumo lines exist

## 4. Verification

- [x] 4.1 Manually verify Productos create: stage a cost line without saving, confirm no network requests fire (browser-driven against the live backend) — confirmed zero mutating requests while staged, row shown with "pendiente" badge. Did **not** click the final "Guardar" (would write to live production data, per the standing preference from the earlier `batch-save-master-detail` change) — the single-POST-then-parallel-costos-POSTs submit logic was code-reviewed, not executed end-to-end
- [x] 4.2 Manually verify Facturas/Gastos create: stage an insumo line without saving, confirm no network requests fire — confirmed zero mutating requests while staged, row shown with "pendiente" badge and correct computed costo. Did **not** click the final "Crear" for the same reason as 4.1 — the embedded-`insumos`-in-one-POST payload was code-reviewed, not executed end-to-end
- [x] 4.3 Manually verify Producto Edit's Costos section and Factura/Gasto Edit's Detalle de Insumos section still behave exactly as before the extraction in section 1 — confirmed live: Producto #50's 18 existing cost lines still render correctly, Factura #308's Detalle de Insumos empty-state still renders correctly
- [x] 4.4 Manually verify the "Cancelar" dirty-guard on both Create pages — confirmed on both pages, correct Spanish message per page, dismissing keeps the user on the same create page
- [x] 4.5 Run `npm run lint` and `npm run build` and fix any errors (both clean; only pre-existing starter-kit lint issues remain, none introduced by this change)
