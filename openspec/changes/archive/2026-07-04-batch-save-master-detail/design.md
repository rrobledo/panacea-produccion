## Context

Three nested detail sections exist today, each following the same shape: fetch the parent's sub-resource list on mount (`useFetch`), render it in a table, and offer Agregar/Editar/Eliminar actions that each open a small `Modal` and, on confirm, immediately call `useMutation` against the backend and `refetch()` the list:

- `ProductoCostosDetail` (bill-of-materials lines under a Producto) — `GET/POST/PUT/DELETE /costos/productos/{id}/costos`
- `FacturaPagos` (payments under a Factura/Gasto) — list via `GET /costos/ctacteprov/{id}/pagos`, create via `POST /costos/ctacteprov` with `tipo_movimiento: 'PAGO'`
- `FacturaInsumosDetail` (raw-material line items under a Factura/Gasto) — `GET/POST/DELETE /costos/ctacteprov/{id}/insumos`

The master record's own form (`ProductoForm`/`FacturaForm`) has an independent "Guardar" that only `PUT`s the master fields. The two save actions are decoupled today: a user can add a Costo line without ever touching "Guardar" on the producto itself.

Separately, `EntityPicker` (the shared searchable-select used for Proveedor/Insumo/Producto everywhere) fetches `GET <resource>` with no filter the moment its modal opens, before the user types anything — i.e. it always retrieves the entire table at least once per open. `FacturaInsumosDetail` additionally calls `useList('/costos/insumos')` on every mount just to build an id→nombre lookup map for rows the backend returns without a denormalized name (`DetalleInsumoRead` only has `insumo` (id), `cantidad`, `subtotal` — no name, unlike `CostoRead` which already includes `insumo_nombre`).

I verified the relevant backend schemas directly against `/openapi.json`:
- `CostoCreate` (`POST`/`PUT` `/costos/productos/{id}/costos[/{costo_id}]`) takes only `{ insumo, cantidad }` — no batch/array variant.
- `CuentaCorrienteProveedorCreate` **and** `CuentaCorrienteProveedorUpdate` both have an `insumos: DetalleInsumoCreate[] | null` field — so a factura's insumos *can* be embedded in the same POST/PUT as the master record. However there is no documentation of whether providing `insumos` on a PUT **replaces** the existing set or **appends** to it, and getting this wrong on an edit could silently delete unrelated insumo lines. There is no equivalent batch field for Pagos (each pago is its own `ctacteprov` row via the generic create endpoint) or for Costos.

## Goals / Non-Goals

**Goals:**
- Adding/editing/removing a Costo, Pago, or Detalle-de-Insumos line makes no network call by itself — it only updates local UI state.
- A single "Guardar" on the master Edit page persists the master fields and every staged detail change, and only reports success / navigates away once all of it is confirmed persisted.
- The user can tell, at a glance, which detail rows are pending (not yet saved) vs. already persisted.
- Cancelling or navigating away with pending changes prompts for confirmation.
- `EntityPicker` and `FacturaInsumosDetail` never fetch a full unfiltered table just to let the user pick or display one item.

**Non-Goals:**
- True backend atomicity/transactions — the backend has no endpoint that persists a master record and all its detail lines in one atomic call (except the unverified `insumos` field noted above, which this design deliberately does not adopt for edits). "Save all together" here means *one user action* that sequences multiple requests and reports one combined result, not one HTTP request.
- Adding Costos/Pagos/Detalle-de-Insumos sections to the Create pages. They stay Edit-only, unchanged from today.
- Changing anything about how Proveedores/Insumos/Productos' own CRUD (the master records themselves, outside these three nested sections) persists — those already save immediately on their own single-entity forms, which is correct and unaffected here.

## Decisions

### 1. A shared `useStagedList` hook drives all three detail sections
Rather than duplicating staging/diffing logic three times, introduce one hook that:
- Takes the server-fetched existing rows (from the same `useFetch` each component already has) and materializes a **display list** merging: existing rows (minus any staged for removal, reflecting any staged edits), plus staged new rows (assigned a temporary negative/uuid id and a `_pending: true` marker so the UI can render a "pendiente" badge).
- Exposes `add(row)`, `edit(id, patch)`, `remove(id)`, `isDirty`.
- Exposes `commit({ create, update, remove })` — an async function the *parent* (the master Edit page) calls during its own save flow, given the three persist functions bound to that resource's endpoints. It runs the staged creates/updates/deletes (in parallel per type, since they're independent rows), and only clears the staged operations once every call has resolved. If any call rejects, it leaves that specific operation staged (not cleared) and re-throws, so the caller can report which item failed and the user can retry just by hitting save again.

This keeps `ProductoCostosDetail`, `FacturaPagos`, and `FacturaInsumosDetail` mostly presentational — they own the hook instance and modal state, and hand their instance's `commit` up via a small imperative handle (`useImperativeHandle`/`forwardRef`) so the parent page can call it without lifting all the row-editing UI state itself. This is the smallest change to the existing component boundaries: the parent doesn't need to know about modals, form fields, or picker state — only "commit whatever this section has pending."

**Alternative considered**: lift all staged state into the parent Edit page and pass it down as props (fully controlled children). Rejected — it would spread each section's row-shape-specific logic (e.g. computing a Detalle-de-Insumos row's `subtotal` from the selected insumo's `precio`) into the parent, coupling `ProductoEditPage`/`FacturaEditPage` to details of sections they shouldn't need to know about. A ref-exposed `commit()` keeps that logic local to each section while still letting the parent coordinate timing.

### 2. Master save sequencing: master PUT first, then commit all sections in parallel
On the master form's submit handler (in `ProductoEditPage`/`FacturaEditPage`, not the form component itself):
1. `PUT` the master record via the existing `useMutation`.
2. On success, call `commit(...)` on every mounted detail section's ref, in parallel (`Promise.allSettled`).
3. If all settle successfully: toast success once, navigate away (current behavior).
4. If master PUT fails: stop — no detail commits attempted (current failure behavior, unchanged).
5. If master PUT succeeds but one or more detail commits fail: stay on the page, toast which section(s) failed, leave those specific staged operations in place (per the hook's retry-friendly behavior above) so the user can just hit "Guardar" again.

**Alternative considered**: commit detail sections *before* the master PUT. Rejected — the sections' create/update calls target `/costos/productos/{id}/costos` etc., which need a stable, already-existing parent id; since we're always on an Edit page (id already exists in the URL), order doesn't matter for that reason, but sequencing master-first matches the mental model "save the record, then its details" and means a failed master save never leaves detail changes half-applied against fields that didn't actually save.

### 3. Detail rows show a "pendiente" state; Cancelar warns on unsaved changes
Add a small visual marker (badge or dashed row style) on any row with `_pending: true`. The master Edit page tracks whether any mounted section reports `isDirty` (or has un-saved form changes) and, on "Cancelar", shows a `window.confirm`-style prompt before navigating away if anything is pending — mirroring the dirty-guard pattern already used by the legacy app's edit screens (noted in the original migration design), just not yet carried into this stack until now.

### 4. `EntityPicker` requires a minimum query before fetching
Add a `MIN_QUERY_LENGTH` (2 characters) gate: the search-results effect does not call the API at all until `debouncedQuery.length >= MIN_QUERY_LENGTH`. Below that, the modal shows a neutral prompt ("Escribí al menos 2 letras para buscar") instead of a spinner or an unfiltered table. This removes every "fetch everything" call the picker currently makes on open.

**Alternative considered**: fetch a small default page (e.g. first 20 rows) when the query is empty, so the modal isn't blank on open. Rejected for now — the `/costos/*` list endpoints have no pagination support (confirmed: they return the full matching set, no `limit`/`page` params), so an "empty query" fetch is indistinguishable from "fetch everything" from the backend's point of view; there is no cheap default page to request. A future backend change adding pagination could revisit this.

### 5. `FacturaInsumosDetail` resolves names per-id, not via the full table
Replace `useList('/costos/insumos')` with a small resolver that, given the loaded `detalle` rows, collects the distinct `insumo` ids that don't already have a cached name (newly staged rows already carry their full row via `EntityPicker`'s `onSelectRow`, so they never need this) and fetches just those via `GET /costos/insumos/{id}`, deduplicated, in parallel. Bounded by the number of distinct insumos actually on that factura (typically small), never the whole table.

## Risks / Trade-offs

- [Partial-failure UX after master PUT succeeds] → Mitigated by keeping failed operations staged (not cleared) so re-clicking "Guardar" retries only what failed, and by toasting which section had a problem rather than a generic error.
- [No real atomicity — a page reload between "master saved" and "details committed" could leave the master updated but details unsaved] → Acceptable: this mirrors the reality of the underlying REST API (no transaction support), and staged/pending detail rows are only ever held in the current page's component state, so a reload always shows the true persisted server state on next load — there's no risk of showing stale "pending" rows as if they were saved.
- [`EntityPicker`'s 2-character minimum could feel like a regression to a user used to browsing the whole list] → Matches the goal explicitly requested (avoid retrieving everything); the existing per-field search behavior (filter-as-you-type) is unchanged once the minimum is met.
- [Reworking `ProductoCostosDetail`/`FacturaPagos`/`FacturaInsumosDetail` to expose an imperative `commit()` is a real API change to those components] → Contained: only their two parent Edit pages call it; no other consumers exist today.

## Migration Plan

1. Build `useStagedList` and prove it against `ProductoCostosDetail` + `ProductoEditPage` first (single detail section, simplest case).
2. Apply the same pattern to `FacturaPagos` and `FacturaInsumosDetail` + `FacturaEditPage` (two sections coordinating together).
3. Fix `EntityPicker`'s fetch-gating and `FacturaInsumosDetail`'s per-id name resolution — independent of the staging work, can land in any order.
4. No backend changes, no data migration. Rollback is a plain revert since no persisted data shape changes.

## Open Questions

- Whether `CuentaCorrienteProveedorUpdate.insumos` (PUT) replaces or appends the existing insumos set — worth asking whoever owns the backend, since if it turns out to be a safe *append-only* merge, a future change could simplify Detalle-de-Insumos saves into the single master PUT instead of separate sub-resource calls. Not resolved here; this design intentionally avoids relying on unverified behavior.
