## Context

`batch-save-master-detail` gave the Edit pages a staged-then-committed model: `useStagedList` tracks local add/edit/remove operations, and each detail section (`ProductoCostosDetail`, `FacturaPagos`, `FacturaInsumosDetail`) exposes `{ isDirty, commit }` via `forwardRef`/`useImperativeHandle` so the parent Edit page can persist everything in one coordinated action after the master `PUT` succeeds. That work deliberately excluded the Create pages, noting the backend's `insumos` field on `ctacteprov` create/update was unverified for replace-vs-append semantics on update.

I reviewed `../panacea-mayorista`'s Remito CRUD as the user asked:
- `RemitosPage.jsx` (create): collects `cliente`, header fields, and a `productos` array entirely in local component state — zero network calls until "Registrar Remito", which does one `POST /remitos` with `detalles: productos.map(...)` embedded.
- `RemitoDetailPage.jsx` (edit): same shape — local state, one `PUT /remitos/{id}` on save, also with the full `detalles` array embedded (that backend treats it as a full replace on update too).
- `ProductoPopup.jsx`: a two-step search-then-quantity modal, gated so it doesn't query until the user types something — the same "don't fetch everything" principle already applied to `EntityPicker`.

The key backend difference: `panacea-mayorista`'s API supports nested-array replace on *both* create and update. Our `panacea-produccion-backend` only confirmedly supports it on **create** (`CuentaCorrienteProveedorCreate.insumos`) — the update variant's semantics remain unverified (an open question carried over from the last change), and there's no equivalent bulk field for Costos (`CostoCreate` is always a single `{insumo, cantidad}`). So this change can only get all the way to "one request" for Facturas' create; Productos' create gets as close as the backend allows (one user action, sequenced requests).

## Goals / Non-Goals

**Goals:**
- Producto and Factura/Gasto creation screens let the user add detail lines before the record exists, with no network call per line.
- One "Crear"/"Guardar" action on each Create page persists the master record and every staged detail line, reporting a single combined result.
- Facturas' Detalle de Insumos on create is a genuine single HTTP request (matching Remito exactly).
- Reuse the existing `useStagedList` hook and `EntityPicker` rather than inventing a parallel mechanism.

**Non-Goals:**
- Pagos on Facturas' create page — impossible today (a pago needs an existing `factura_id`), not attempted.
- Changing anything about the Edit-time flow built in `batch-save-master-detail` — it stays exactly as it is.
- Adopting `ctacteprov`'s update-time `insumos` field — still unverified, still out of scope.
- Matching Remito's UI/UX details (two-step popup, print copies, estado transitions) — only the "collect everything, save once" architecture is being adopted, not the reference app's specific screens.

## Decisions

### 1. Extract presentational line-items components, shared between Edit and Create
`ProductoCostosDetail` and `FacturaInsumosDetail` currently each mix three concerns: fetching existing rows, staging changes (`useStagedList`), and rendering the table + add/edit modal. The Create pages need the same rendering and staging behavior but with no existing rows to fetch and no independent `commit()` — insumos are only ever sent once, embedded in or immediately following the master save.

Split each into:
- A presentational component (`CostosLinesEditor` for Productos, `InsumosLinesEditor` for Facturas) that takes `{ items, onAdd, onEdit?, onRemove }` and renders the table + `EntityPicker`-based add modal. No fetching, no network, no ref.
- The existing Edit components (`ProductoCostosDetail`, `FacturaInsumosDetail`) become thin wrappers: they own the `useFetch` (existing rows) + `useStagedList` + `forwardRef`/`commit` logic, and render the presentational component underneath.
- The new Create-page sections instantiate `useStagedList([])` directly in the Create page (or a small local wrapper) and render the same presentational component, with no ref needed — the parent already holds the staged items in scope for its own submit handler.

**Alternative considered**: give the presentational components their own internal `useStagedList` call, parameterized by an `existingRows` prop that's `[]` on create. Rejected — the Edit wrapper still needs its own `useFetch` + ref + commit-to-network logic that the Create case doesn't want, so the "thin wrapper vs. presentational core" split is cleaner than conditionally enabling network behavior inside one component.

### 2. Facturas' create: embed staged insumos in the single POST
`FacturaCreatePage` holds its own `useStagedList([])` instance for insumos. On submit, the payload sent to `POST /costos/ctacteprov` becomes:
```js
{ ...masterFields, insumos: staged.items.length ? staged.items.map(r => ({ insumo: r.insumo, cantidad: r.cantidad, subtotal: r.subtotal })) : undefined }
```
No follow-up requests. This is the one case in this change that reaches full parity with Remito's single-request save.

**Alternative considered**: create the factura first, then POST each insumo line to `/costos/ctacteprov/{id}/insumos` like the Edit flow does. Rejected — the backend already gives us a batch-capable field for exactly this case; using it is strictly simpler and is a real single request, not just a single user action.

### 3. Productos' create: sequence producto-then-costos behind one user action
`ProductoCreatePage` holds its own `useStagedList([])` instance for cost lines. On submit:
1. `POST /costos/productos` with the master fields → get the new producto's id.
2. If any cost lines were staged, `POST /costos/productos/{id}/costos` for each, in parallel.
3. Report one combined success/failure; only navigate away once everything has settled.

If step 1 fails, step 2 never runs (nothing to attach lines to). If step 1 succeeds but some cost lines fail in step 2, the user is told the producto was created but which cost lines didn't save — since the producto now exists, they can finish adding the failed lines from its Edit page rather than losing the whole submission.

**Alternative considered**: don't add Costos to Producto's create page at all, since it can never be a true single request. Rejected — the user explicitly asked for master-detail creation to work this way, and "one user action, sequenced requests, one result" is still a real improvement over today's "create, then separately remember to go edit it" — it's the same spirit as Remito even if the backend can't make it one HTTP call.

### 4. Reuse `EntityPicker` as-is
No changes needed — the search-gating (2-character minimum) and per-id label resolution from `batch-save-master-detail` already match the "don't fetch everything" principle demonstrated by `ProductoPopup.jsx` in the reference app.

## Risks / Trade-offs

- [Producto create: partial failure leaves an orphaned producto with some/no cost lines] → Mitigated by the toast explicitly saying the producto *was* created and which lines weren't saved, and by the producto's Edit page already supporting adding/retrying cost lines (built in `batch-save-master-detail`) — nothing is unrecoverable, just requires one extra step for the failed lines only.
- [Two similar-but-different "insumo/costo line" UIs (Create's embedded-in-payload vs. Edit's committed-after-master-save) could drift apart over time] → Mitigated by sharing the presentational component; only the persistence wiring differs, and that difference is inherent to what the backend allows for each record type.
- [Relying on `CuentaCorrienteProveedorCreate.insumos` assumes its shape stays stable] → Low risk; it's already a confirmed, documented field on the live OpenAPI schema, unlike the update variant this change deliberately avoids.

## Migration Plan

1. Extract `CostosLinesEditor` from `ProductoCostosDetail`; verify the Edit page still works identically (pure refactor, no behavior change).
2. Extract `InsumosLinesEditor` from `FacturaInsumosDetail`; same verification.
3. Wire `CostosLinesEditor` into `ProductoCreatePage` with the sequenced producto→costos submit.
4. Wire `InsumosLinesEditor` into `FacturaCreatePage` with the embedded-insumos single-request submit.
5. No backend changes, no data migration, no rollback concerns beyond a plain revert.

## Open Questions

- Same one carried over from `batch-save-master-detail`: whether `CuentaCorrienteProveedorUpdate.insumos` replaces or appends on update. Still not needed for this change (create-only), but resolving it could let a future change simplify the Edit-time Detalle de Insumos save the same way this change simplifies Create.
