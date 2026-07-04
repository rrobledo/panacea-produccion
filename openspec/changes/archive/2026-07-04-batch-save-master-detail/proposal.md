## Why

On Productos and Facturas/Gastos, the nested detail sections (Costos, Pagos, Detalle de Insumos) currently persist every add/edit/remove immediately against the backend the instant a modal is confirmed — independent of the master record's own "Guardar" button. This means a user adding three insumo lines to a factura fires three separate network requests before ever touching the master fields, with no single "review, then commit" moment and no way to discard a batch of in-progress edits. It also means the search picker used to pick a Proveedor/Insumo/Producto fetches the entire unfiltered table the moment it opens, which is wasteful and slow as those tables grow (currently 80–140+ rows each) and scales worse over time.

## What Changes

- **BREAKING** (behavioral): On Productos' Costos (bill-of-materials) and Facturas/Gastos' Pagos and Detalle de Insumos sections, adding/editing/removing a detail row no longer calls the backend immediately. Changes are staged client-side and shown in the table right away (marked as pending), and are only persisted when the user saves the master record — one "Guardar" commits the master fields and every staged detail change together.
- Each master Edit page's save action becomes a coordinated multi-step save: PUT the master record first; if that succeeds, fire the necessary create/update/delete calls for every staged detail change; only navigate away and show success once all of it has settled. If the master save fails, no detail changes are attempted. If a detail change fails, the user stays on the page with that item still marked pending so they can retry.
- An unsaved-changes indicator appears when there are staged detail edits, and navigating away (Cancelar) with pending changes asks for confirmation before discarding them.
- `EntityPicker` (used to select Proveedor/Insumo/Producto everywhere) no longer fetches the full unfiltered list when opened — it now requires a minimum search input before querying the backend, and shows a "type to search" prompt state until then.
- `FacturaInsumosDetail` no longer fetches the entire Insumos table to resolve display names for existing line items — it resolves only the specific insumo ids referenced by that factura's own detalle rows.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `productos`: "Manage Bill-of-Materials (Costos)" changes from immediate per-line persistence to client-staged changes committed together with the producto's own save.
- `facturas-gastos`: "Manage Pagos", "Add Insumo to Detalle", and "Remove Insumo from Detalle" change from immediate persistence to client-staged changes committed together with the factura/gasto's own save; "Edit Factura/Gasto" and "Create Factura/Gasto" gain the coordinated multi-step save and the picker-search behavior for Proveedor selection.

## Impact

- **Affected code**: `src/components/form/EntityPicker.jsx` (search-gating), `src/pages/productos/ProductoCostosDetail.jsx`, `src/pages/productos/ProductoEditPage.jsx`, `src/pages/facturas/FacturaPagos.jsx`, `src/pages/facturas/FacturaInsumosDetail.jsx`, `src/pages/facturas/FacturaEditPage.jsx`. Likely a new shared hook for staged add/edit/remove list state, reused by all three detail sections.
- **Backend**: No backend changes; uses the same existing endpoints (`/costos/productos/{id}/costos`, `/costos/ctacteprov/{id}/pagos`... via `POST /costos/ctacteprov`, `/costos/ctacteprov/{id}/insumos`), just triggered at a different time (save-time instead of per-action).
- **Not in scope**: Adding Costos/Pagos/Detalle de Insumos sections to the *Create* pages (they currently only appear on Edit, since the parent record must exist first) — this change only affects existing Edit-time sections. The backend's create/update payloads for `ctacteprov` do technically accept an inline `insumos` array, but its replace-vs-append semantics on update are unverified, so this change keeps using the known-safe dedicated sub-resource endpoints rather than adopting that field.
