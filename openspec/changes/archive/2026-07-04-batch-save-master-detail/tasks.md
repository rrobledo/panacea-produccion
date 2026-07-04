## 1. Shared staged-list hook

- [x] 1.1 Create `src/hooks/useStagedList.js`: takes server-fetched existing rows + a row-id field, exposes `items` (merged display list: existing rows with staged edits applied, minus staged removals, plus staged additions marked `_pending: true`), `add(row)`, `edit(id, patch)`, `remove(id)`, `isDirty`
- [x] 1.2 Add `commit({ create, update, remove })` to the hook: runs all staged creates/updates/deletes (parallel per type) against the caller-supplied persist functions; on full success clears staged operations; on any failure, leaves only the failed operation(s) staged and rethrows/reports which ones failed
- [x] 1.3 Add a small CSS treatment for pending rows (e.g. `.row-pending` — dashed border or muted background) reusing the existing `index.css` conventions

## 2. EntityPicker: avoid retrieving the full list

- [x] 2.1 Add a `MIN_QUERY_LENGTH = 2` gate in `EntityPicker.jsx`'s results effect: do not call `api.get(resource, ...)` at all while `debouncedQuery.length < MIN_QUERY_LENGTH`
- [x] 2.2 Replace the "Sin resultados" empty state (shown pre-search) with a distinct prompt state ("Escribí al menos 2 letras para buscar") when below the minimum, so it's visually clear no search has happened yet
- [x] 2.3 Verify existing consumers (Proveedor picker in `FacturaForm`, Insumo picker in `ProductoCostosDetail` and `FacturaInsumosDetail`) still resolve the selected value's label correctly on load (the by-id label lookup in `EntityPicker` is unaffected by this change — only the search-modal's list-fetch is gated)

## 3. FacturaInsumosDetail: resolve insumo names per-id

- [x] 3.1 Remove the `useList('/costos/insumos')` full-table fetch and its `insumoById` map built from it
- [x] 3.2 Add per-id name resolution: collect distinct `insumo` ids from the loaded `detalle` rows that aren't already known (newly staged rows already carry their full row from `EntityPicker`'s `onSelectRow`), fetch each via `GET /costos/insumos/{id}` (deduplicated, in parallel), and cache the results for display
- [x] 3.3 Confirm the "Quitar" confirmation dialog and cost-column rendering still show the correct insumo name after this change

## 4. Productos: staged Costos (bill-of-materials)

- [x] 4.1 Rework `ProductoCostosDetail` to use `useStagedList` instead of its own `useMutation`-per-action calls: Agregar/Editar/Eliminar update local staged state only, no network call, modal closes immediately
- [x] 4.2 Expose the hook's `commit` via `forwardRef`/`useImperativeHandle` so `ProductoEditPage` can call it
- [x] 4.3 Update `ProductoEditPage`'s save handler: PUT the producto master fields first; on success, call the `ProductoCostosDetail` ref's `commit({ create, update, remove })` bound to `POST`/`PUT`/`DELETE /costos/productos/{id}/costos[/{costo_id}]`; only toast success and navigate once commit resolves
- [x] 4.4 On commit failure, stay on the page, toast which cost line(s) failed to save, leave them staged
- [x] 4.5 Add a "Cancelar" confirmation prompt on `ProductoEditPage` when `ProductoCostosDetail` reports `isDirty`

## 5. Facturas/Gastos: staged Pagos and Detalle de Insumos

- [x] 5.1 Rework `FacturaPagos` to use `useStagedList`: Registrar Pago stages a new pago locally (no network call), modal closes immediately; expose `commit` via ref, bound to `POST /costos/ctacteprov` (with `tipo_movimiento: 'PAGO'`) for each staged pago (pagos are creation-only today — no edit/remove requirement, so `commit`'s `update`/`remove` are unused for this section)
- [x] 5.2 Rework `FacturaInsumosDetail` to use `useStagedList`: Agregar/Quitar Insumo stage locally (no network call); expose `commit` via ref, bound to `POST`/`DELETE /costos/ctacteprov/{id}/insumos[/{detalle_id}]`
- [x] 5.3 Update `FacturaEditPage`'s save handler: PUT the factura/gasto master fields first; on success, call both `FacturaPagos` and `FacturaInsumosDetail` refs' `commit(...)` in parallel (`Promise.allSettled`); only toast success and navigate once both resolve
- [x] 5.4 On partial commit failure, stay on the page, toast which section(s) failed, leave the failed operations staged
- [x] 5.5 Add a "Cancelar" confirmation prompt on `FacturaEditPage` when either section reports `isDirty`
- [x] 5.6 Apply the `EntityPicker` search-gating (already fixed in section 2) to the Proveedor picker on `FacturaForm` — verify it behaves correctly on both Create and Edit

## 6. Verification

- [x] 6.1 Manually verify on Productos edit: add a Costo line without saving, confirm no network requests fire (browser-driven against the live backend, real producto #50) — confirmed zero mutating requests while staged, row shown with "pendiente" badge; did **not** click the final "Guardar" (would write to live production data — left for the user to confirm per their earlier preference on the previous change)
- [x] 6.2 Manually verify on Facturas/Gastos edit: stage a Pago without saving, confirm no network requests fire (real factura #308) — confirmed zero mutating requests while staged, row shown with "pendiente" badge; final "Guardar" not clicked for the same reason as 6.1
- [ ] 6.3 Manually verify the partial-failure path (e.g. temporarily point one persist call at an invalid id) leaves the user on the page with the failed item still staged and retryable — **not exercised end-to-end**; `useStagedList.commit`'s try/catch-per-operation behavior was code-reviewed (failed operations are excluded from the "succeeded" cleanup, so they remain staged) but not driven through an actual induced failure
- [x] 6.4 Manually verify "Cancelar" with pending changes prompts for confirmation, and confirms discarding correctly — confirmed on both Productos (single section) and Facturas/Gastos (message correctly names "Pagos o Detalle de Insumos"); dismissing the confirm correctly kept the user on the same edit page
- [x] 6.5 Manually verify `EntityPicker` never issues a request for the full list on open, only after typing at least 2 characters — confirmed: 1 character shows the "Escribí al menos 2 letras" prompt with no request, 2 characters triggers the real search
- [x] 6.6 Manually verify `FacturaInsumosDetail` only requests the specific insumo ids present on that factura, not the full insumos table — confirmed no bare `GET /costos/insumos` fires on page load; no factura in the live backend currently has existing Detalle de Insumos rows to further verify the per-id fetch path against (a brand-new feature with no usage yet), so that specific branch is code-reviewed only
- [x] 6.7 Run `npm run lint` and `npm run build` and fix any errors (both clean; only pre-existing starter-kit lint issues remain, none introduced by this change)
