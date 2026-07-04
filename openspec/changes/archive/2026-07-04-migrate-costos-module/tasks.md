## 1. Networking & Environment Setup

- [x] 1.1 Add `.env.example` with `VITE_BACKEND_API_URL` (empty/blank for proxied same-origin) and `VITE_GOOGLE_CLIENT_ID`
- [x] 1.2 Update `vite.config.js` with a dev proxy for `/auth`, `/costos`, `/profile` → `https://panacea-produccion-backend.vercel.app` (mirroring `panacea-clubsocios/vite.config.js`)
- [x] 1.3 Update `vercel.json` with equivalent production `rewrites` for `/auth/:path*`, `/costos/:path*`, `/profile/:path*`, keeping the existing SPA-fallback rewrite and asset cache headers
- [x] 1.4 Rewrite `src/services/api.js`: axios instance with `baseURL: import.meta.env.VITE_BACKEND_API_URL || ''`, request interceptor attaching `Authorization: Bearer` from the stored session, response interceptor clearing session + redirecting to `/login` on 401; remove the old generic `createCrudService`/placeholder services

## 2. Authentication (capability: auth)

- [x] 2.1 Replace `src/context/AuthContext.jsx` with the `panacea-clubsocios`-modeled version: local storage key `panacea_produccion_auth`, `loginWithGoogle`, `loginWithCredentials` (POST `/auth/token` as form-urlencoded), `handleOAuthCallback`, JWT decode helper, `logout`
- [x] 2.2 After login/callback, call `GET /profile/me` and store the profile fields on the auth context's `user` (confirm exact `ProfileResponse` shape against `/docs` first)
- [x] 2.3 Replace `src/components/auth/LoginPage.jsx` with a Spanish email/password + "Continuar con Google" screen (reuse `auth.css` styling approach)
- [x] 2.4 Replace `src/components/auth/OAuthCallback.jsx` to read `token`/`error` query params and call `handleOAuthCallback`
- [x] 2.5 Update `App.jsx`'s `PrivateRoute` / route table to use the new context; remove references to the old placeholder auth shape (PrivateRoute already generic; business routes replace demo routes in section 10)
- [x] 2.6 Update `AppLayout.jsx`'s user menu/logout button to bind to the new `user`/`logout` shape (email/role, Spanish copy)

## 3. Shared Building Blocks

- [x] 3.1 Add `formatCurrencyARS(value)` helper (replaces repeated inline `toLocaleString('es-AR', {...})` calls across every money column)
- [x] 3.2 Add a reusable `EntityPicker` component (text input + debounced `useList` search + `Modal` result list + selection) to replace `InputListSearch`, parameterized by resource and search/id field names
- [x] 3.3 Add a reusable `EditableGrid` pattern/component (controlled inputs per row/column, dirty-cell tracking `Map`, "Actualizar" diff-and-save) for Planning/Programación
- [x] 3.4 Add sessionStorage-based list-state persistence (filters/scroll/selected row) decoupled from any specific table DOM structure, for reuse across list pages
- [x] 3.5 Add a file-attachment `Field` supporting clipboard-paste and file-picker image capture, converting to base64 on submit (replaces `ClipboardImageItem`)

## 4. Proveedores (capability: proveedores)

- [x] 4.1 `ProveedoresPage`: list via `useList('/costos/proveedores')` + `DataGrid` (Nombre, CUIT, Teléfono)
- [x] 4.2 `ProveedorForm` (shared create/edit): Nombre, CUIT, Teléfono, Email (zod email validation), Dirección; `id` read-only on edit
- [x] 4.3 Wire create/edit/delete mutations (`POST`/`PUT`/`DELETE /costos/proveedores`) with `ConfirmDialog` on delete and toast feedback
- [x] 4.4 Add routes `/proveedores`, `/proveedores/create`, `/proveedores/:id/edit` and nav entry under "Proveedores"

## 5. Insumos (capability: insumos)

- [x] 5.1 `InsumosPage`: list via `useList('/costos/insumos')` + `DataGrid` (Nombre, Cantidad, Unidad de Medida, Precio)
- [x] 5.2 `InsumoForm` (shared create/edit): Nombre, Cantidad, Unidad de Medida select (ML/GR/UN/KG/LT), Precio; `id` read-only on edit
- [x] 5.3 Wire create/edit/delete mutations against `/costos/insumos`
- [x] 5.4 Add routes `/insumos`, `/insumos/create`, `/insumos/:id/edit` and nav entry

## 6. Productos + Bill of Materials (capability: productos)

- [x] 6.1 `ProductosPage`: list via `useList('/costos/productos')` + `DataGrid` (Código, Nombre, Categoría, Referencia, Utilidad, Precio Actual, Lote, Unidad de Medida, Tiempo de Producción, Habilitado ✅, Prioridad)
- [x] 6.2 `ProductoForm` (shared create/edit): all fields incl. Categoría select (10 fixed values, extracted to a shared constants file), Unidad de Medida, Habilitado/Producto Final booleans; `codigo` read-only on edit
- [x] 6.3 Wire create/edit/delete mutations against `/costos/productos`
- [x] 6.4 `ProductoCostosDetail`: nested list/create/edit of BOM lines under a producto's edit page — list via `GET /costos/productos/{id}/costos`, create/edit via `EntityPicker` (insumo) + Cantidad, using `POST`/`PUT`/`DELETE /costos/productos/{id}/costos[/{costo_id}]`
- [x] 6.5 Add routes `/productos`, `/productos/create`, `/productos/:id/edit` and nav entry

## 7. Facturas/Gastos + Pagos + Detalle de Insumos (capability: facturas-gastos)

- [x] 7.1 `FacturasPage`: list via `useList('/costos/ctacteprov')` + `DataGrid` (Fecha, Tipo Movimiento, Proveedor, Observaciones, Categoría, Estado, Importe Total, Importe Pendiente), with Fecha Desde/Fecha Hasta/Estado filter form
- [x] 7.2 Wire the summary panel (Total Facturas Pendientes, Total Gastos en el Periodo) via `GET /costos/ctacteprovresumen` scoped to the active filters
- [x] 7.3 `FacturaForm` (shared create/edit): Proveedor (`EntityPicker`), Número, Fecha de Emisión/Vencimiento, Importe Total, Categoría select, Tipo de Pago select, Caja select, Observaciones, two image attachments
- [x] 7.4 Wire create/edit/delete mutations against `/costos/ctacteprov`
- [x] 7.5 `FacturaPagos`: nested list + create of payments under a factura's edit page (`GET`/`POST /costos/ctacteprov/{factura_id}/pagos`), prefilling proveedor/factura_id from the parent record
- [x] 7.6 **New**: `FacturaInsumosDetail`: nested list of `GET /costos/ctacteprov/{id}/insumos` (Insumo, Cantidad, Costo) shown on the factura edit page, with an empty state when there are none
- [x] 7.7 **New**: "Agregar Insumo" modal on `FacturaInsumosDetail` using `EntityPicker` over `/costos/insumos` + Cantidad input, `POST /costos/ctacteprov/{id}/insumos`
- [x] 7.8 **New**: "Quitar" action per insumo row with `ConfirmDialog`, `DELETE /costos/ctacteprov/{id}/insumos/{detalle_id}`
- [x] 7.9 Add routes `/ctacteprov`, `/ctacteprov/create`, `/ctacteprov/:id/edit` and nav entry "Facturas/Gastos"

## 8. Planning & Programación (capability: planning-programacion)

- [x] 8.1 `PlanningPage`: fetch `/costos/planning_columnas?anio=` + `/costos/planning?anio=`, render via `EditableGrid`, Año filter
- [x] 8.2 Wire "Actualizar" to diff changed rows and `POST /costos/planning`, then refetch
- [x] 8.3 `ProgramacionPage`: fetch `/costos/programacion_columnas` + `/costos/programacion`, render via `EditableGrid`, with Año/Mes/Semana/Responsable filters
- [x] 8.4 Wire "Actualizar" to diff changed rows and `POST /costos/programacion`, then refetch
- [x] 8.5 Verify `planning_columnas?anio=2024` produces a usable column set before confirming `planning2024.tsx`'s static layout is safe to drop (confirmed via live curl — same 12-month shape)
- [x] 8.6 Add routes `/planning`, `/programacion` and nav entries

## 9. Reportes de Costos (capability: reportes-costos)

- [x] 9.1 `DashboardPage`: KPI cards + charts (recharts) sourced from `get_produccion_by_category`, `get_ventas_por_cliente`, `ctacteprovresumen`, replacing the old unwired demo dashboard
- [x] 9.2 `ProduccionPage`: 4 panels (categoría, productos, insumos por semana, insumos mensual) with Año/Mes/Semana filters, computed percentage/total rows, print action on the insumos panels
- [x] 9.3 `VentasPage`: grouped Cantidad/Totales table with Año/Mes/Cliente filters and print action
- [x] 9.4 `PrecioProductosPage`: read-only `DataGrid` over `/costos/precio_productos` with currency formatting
- [x] 9.5 `EstimacionesPage`: read-only `DataGrid` over `/costos/precio_productos` with **working** Mes filter (fix the legacy dead-filter bug — dropped "Año", the live backend's `/costos/precio_productos` only accepts an optional `mes` query param, confirmed via `/openapi.json`)
- [x] 9.6 `CostosMateriaPrimaPage`: read-only list over `/costos/costos_materia_prima` with link to detail view
- [x] 9.7 `CostosMateriaPrimaDetailPage`: read-only breakdown from `/costos/costos_materia_prima/{producto_id}` including nested insumo-level table
- [x] 9.8 Add routes for dashboard/produccion/ventas/precio-productos/estimaciones/costos-materia-prima(+detail) and nav entries under "Reportes"

## 10. Navigation, Cleanup & Removal of Placeholders

- [x] 10.1 Update `AppLayout.jsx`'s `NAV` array to the real Spanish business navigation (Proveedores, Insumos, Facturas/Gastos, Productos, Planning, Programación, Reportes) replacing the starter-kit demo nav
- [x] 10.2 Remove starter-kit placeholder pages/routes no longer used: `DashboardPage` (demo, replaced by the real one), `ChartsPage`, `ProductsPage` (demo), `FormPages`, `PrintableReportPage`, and their nav entries/routes (deleted the page files; App.jsx route table and AppLayout NAV now contain only real business routes)
- [x] 10.3 Confirm no `antd`, `ag-grid-*`, or `dayjs` imports remain anywhere in `src/` (grepped — none found; only a descriptive code comment mentions "legacy antd+ag-Grid" as context for what `EntityPicker` replaces)
- [x] 10.4 Confirm all new UI copy (labels, buttons, messages, validation errors) is in Spanish (also fixed two shared-component gaps: `ConfirmDialog`'s hardcoded English button/default text in `ui/index.jsx`, and added a Spanish `getErrorMessage` status-code mapping used by all `ErrorState`/empty-state fallbacks instead of raw Axios error messages)

## 11. Verification

- [ ] 11.1 Manually exercise each capability's create/edit/delete flow against the live backend and confirm data round-trips — **read paths verified live** (browser-driven, real data) for Proveedores/Insumos/Productos/Facturas list+edit/Planning/Programación/Dashboard/Producción/Costo Materia Prima(+detail); **write paths (create/edit/delete) not exercised** — this is real production data (real client names, real invoice amounts) and doing so needs the user's explicit go-ahead or a staging backend. Mutation code was verified by reading it against the live OpenAPI schemas, not by executing it.
- [ ] 11.2 Manually verify the new Detalle de Insumos add/remove flow end-to-end — read side verified live (empty-state and populated-state rendering); add/remove (writes) not exercised, same reason as 11.1
- [ ] 11.3 Manually verify Planning/Programación inline edit + diffed save only sends changed rows — grid rendering with live data verified; the actual diffed-POST payload not exercised against the live backend, same reason as 11.1
- [x] 11.4 Run `npm run lint` and `npm run build` and fix any errors (both clean; only pre-existing starter-kit lint issues remain, none introduced by this change)
- [x] 11.5 Confirm Remitos was not touched/reintroduced anywhere in routes, nav, or services (grepped `src/` for "remito" — zero matches)

**Bugs found and fixed during this verification pass** (not in the original task list, discovered via live browser testing):
- `FacturaPagos` crashed on a transient `null` factura prop caused by a React 19 StrictMode dev-only double-effect race in the shared `useFetch` hook — fixed by guarding the render in `FacturaEditPage`.
- Root cause of the above: `useFetch` (`src/hooks/index.js`) let a stale, aborted request's `finally` clobber state set by a newer request. Fixed at the source since it affects every Edit page in the app (an aborted request could otherwise leave `initialData` blank in any form, since react-hook-form only reads `defaultValues` once at mount).
- `YEARS`/`ANIOS` picklists in Planning, Programación, and Reportes were hardcoded to `[2024, 2025]`/`[2024, 2025, 2026]` — replaced with a `recentYears()` helper so the current year is always selectable and pre-selected by default.
- Programación's "Todos" Responsable filter sent `responsable=''` to the backend, which the API interprets as "match empty string" (0 rows) rather than "no filter" — fixed by omitting the param when unset.
- Dashboard's Ventas por Cliente aggregation double-counted every client (the endpoint returns both a canonical monthly-total row per client and duplicate per-week rows using a leading-space-prefixed client name) — fixed to keep only the canonical row per client.
