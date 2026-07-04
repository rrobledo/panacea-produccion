## Context

This repo (`panacea-produccion`) is currently a Vite + React 19 starter kit ("react-enterprise-ui" skill scaffold) with only placeholder pages. The real, in-use application lives at `../panacea-front`: a Create React App + TypeScript + antd + ag-Grid SPA covering suppliers, materials, products, supplier invoices/expenses, production planning/scheduling, and cost reports for a bakery-style production business ("costos" domain). It currently talks to a retired backend at `https://panacea-one.vercel.app/costos`.

The new backend, `https://panacea-produccion-backend.vercel.app` (FastAPI, OpenAPI docs at `/docs`), exposes the equivalent domain under `/costos/*` plus `/auth/*` and `/profile/me`. A sibling app, `../panacea-clubsocios`, already solved authentication and same-origin API proxying against this same backend family (different backend instance, same pattern), and is the reference implementation the user asked us to copy for auth.

Constraints:
- Target stack has no antd, no ag-Grid, no dayjs — must reuse this repo's existing `DataGrid` (TanStack Table v8), `react-hook-form` + `zod`, `ui` primitives (`Modal`, `Field`, `Tabs`, `StatusBadge`, etc.), `date-fns`, `lucide-react`.
- UI language: Spanish (matches the legacy app's copy already).
- Backend read endpoints (`GET /costos/**`) are public; write endpoints accept an optional, unenforced `x-api-key` — the SPA never sets it and instead always sends the user's `Authorization: Bearer` token (consistent behavior, forward-compatible if the backend starts enforcing auth on writes).
- Remitos is explicitly out of scope (owned by another module).

## Goals / Non-Goals

**Goals:**
- Reproduce every current `panacea-front` capability (minus Remitos) against the new backend, in Spanish, on the existing component idioms.
- Add the new "Detalle de Insumos" sub-resource on Facturas/Gastos, using the backend's already-existing `/costos/ctacteprov/{id}/insumos` endpoints.
- Reuse the `panacea-clubsocios` auth architecture as closely as possible so the two sibling apps stay operationally consistent (same storage shape, same proxy pattern, same OAuth flow).
- Replace ag-Grid inline-editable grids (Planning/Programación) with a lighter, dependency-free editable table built on the existing `DataGrid`/table primitives.

**Non-Goals:**
- Pixel-parity with the antd look — visuals follow this repo's existing design tokens/CSS, not antd.
- Multi-tenant / multi-backend switching — single backend base URL.
- Preserving `planning2024.tsx` as a separate hardcoded-column screen — it is superseded by the dynamic-column Planning implementation (same feature, one less code path).
- Fixing unrelated legacy bugs found during discovery that aren't required for parity (see Risks) beyond what's needed to not carry them forward silently.

## Decisions

### 1. Auth: port `panacea-clubsocios`'s `AuthContext` almost verbatim
Reuse: single `localStorage` blob holding `{ access_token, email, ... }`, JWT payload decoded client-side for display fields, `loginWithGoogle()` redirect to `${BACKEND}/auth/google?redirect_uri=...`, `loginWithCredentials(email, password)` POSTing `application/x-www-form-urlencoded` to `/auth/token` (OAuth2 password grant, matches this backend's declared `OAuth2PasswordBearer` scheme), `OAuthCallback` reading `?token=&error=` from the redirect and calling `handleOAuthCallback`.

Deviation: `panacea-clubsocios` decodes `socio_id` out of the callback query/JWT because that domain is socio-centric. This backend instead exposes `GET /profile/me` (Bearer-protected) returning a `ProfileResponse`. After both `loginWithCredentials` and `handleOAuthCallback` obtain a token, call `GET /profile/me` once to populate `user` (name/email/role) rather than trusting query params. Store under a distinct localStorage key (`panacea_produccion_auth`) so this app's session never collides with `panacea-clubsocios` if both are ever opened on the same browser profile/domain.

Alternatives considered: keep the starter kit's generic `/auth/login` + `/auth/profile` placeholder contract — rejected, doesn't match the real backend's OAuth2-password + Google-redirect contract.

### 2. Networking: same-origin proxy, not a hardcoded absolute API base
Mirror `panacea-clubsocios`: `vite.config.js` gets a dev-only proxy for `/auth`, `/costos`, `/profile` → `https://panacea-produccion-backend.vercel.app`; `vercel.json` gets the equivalent `rewrites` for production. `src/services/api.js` axios instance uses `baseURL: import.meta.env.VITE_BACKEND_API_URL || ''` (empty = same-origin, proxied) with a request interceptor attaching `Authorization: Bearer <access_token>` from the stored session, and a response interceptor clearing the session + redirecting to `/login` on 401.

Alternatives considered: call the backend's absolute URL directly from the browser — rejected, would need CORS configuration on a backend we don't control here and diverges from the proven sibling-app pattern.

### 3. Generic CRUD scaffolding: hooks + `DataGrid`/forms, not a port of `DataList`/`DataCreate`/`DataEdit`
`panacea-front`'s generic components (`DataList`, `DataCreate`, `DataEdit`, `GenericFilter`, `InputListSearch`) are antd-form-instance-bound and won't translate 1:1. Instead:
- List pages: `useList('/costos/<resource>')` (already fetches full arrays; backend has no server pagination — matches legacy behavior where all filtering/paging was client-side) feeding the existing `DataGrid`.
- Create/Edit pages: `react-hook-form` + `zod` schema + `Field` wrapper + `useMutation`, following the `MasterDetailForm` pattern already in this repo for master/detail cases (Productos→Costos, Facturas→Pagos, Facturas→Detalle Insumos).
- `InputListSearch` (type-ahead picker modal over `proveedores`/`productos`/`insumos`) is rebuilt as a small reusable `EntityPicker` component: text input + debounced `useList` query + `Modal` results list — same UX contract, no ag-Grid dependency.
- Per-list state persistence (`useListState`'s sessionStorage filter/scroll restore) is reimplemented generically but decoupled from antd Table's DOM (`scrollToRow` keys off a `data-row-id` attribute the new `DataGrid` rows will carry).

Alternatives considered: line-by-line port `DataList`/`DataCreate`/`DataEdit` as generic components using native `<table>`/`<form>` — rejected as duplicate abstraction; this repo already has equivalent, idiomatic generic pieces (`DataGrid`, hooks, `Field`) that the "Adding a New Page" / "CRUD page checklist" sections of `SKILL.md` are built around, and reviewers/future maintainers will expect that shape.

### 4. Detalle de Insumos (new feature)
On the Facturas/Gastos edit page, add a `FacturaInsumosDetail` panel (same slot where `FacturasPagos`/pagos list currently sits) that:
- Loads via `GET /costos/ctacteprov/{entry_id}/insumos` on mount (`useFetch`, keyed off the route's `:id`).
- Presents rows (insumo, cantidad, costo) in a small `DataGrid`/table with a "Quitar" action per row (`DELETE /costos/ctacteprov/{entry_id}/insumos/{detalle_id}`, `useMutation` + `ConfirmDialog`).
- "Agregar Insumo" opens a `Modal` with the `EntityPicker` (over `/costos/insumos`) + cantidad input, `POST`ing to the same endpoint (`DetalleInsumoRead[]`, batch-capable — UI sends a single-item array).
- Only rendered on Edit (a factura must exist before it can have line items), consistent with how Pagos already only appears in `FacturaEdit`.

### 5. Planning / Programación editable grids
Both screens share one server-driven-columns editable-table pattern: fetch column defs (`/costos/planning_columnas` or `/costos/programacion_columnas`) and rows (`/costos/planning` or `/costos/programacion`) separately; render an editable `<table>` (plain controlled inputs per numeric cell, not a new ag-Grid-equivalent dependency) that tracks a `Map` of changed rows in local state, visually flags dirty cells, and on "Actualizar" POSTs only the changed fields per row (id + whatever changed), mirroring the legacy diff-before-save behavior. `planning2024.tsx`'s hardcoded 2024-only column layout is dropped; the dynamic-column implementation already covers any year the backend returns columns for.

### 6. Read-only report pages
`Producción`, `Ventas por Cliente`, `Precio Productos`, `Estimaciones`, `Costo Materia Prima` (+ detail) map directly onto `useFetch`/`useList` + `DataGrid` (or plain grouped `<table>` where the legacy grid used grouped headers, e.g. Producción's category/product panels and Ventas' Cantidad/Totales groups — `DataGrid`'s column defs support this via TanStack's `columns` grouping). Currency formatting centralizes into a small `formatCurrencyARS` helper (replacing the repeated inline `toLocaleString('es-AR', {...})` calls). The `estimaciones.tsx` bug where filters didn't actually refetch, and its hardcoded resource string, are **fixed** (filters wired to `useList`'s `filter()`), since silently reproducing a known-dead control would be worse than fixing it — flagged here rather than left implicit.

`mainDashboard.tsx` (legacy: static fake chart, no API calls) is rebuilt for real using `recharts` (`KpiCard`/`RevenueChart`/`DonutChart` already in this repo), sourced from the same `/costos/get_produccion_by_category`, `/costos/get_ventas_por_cliente`, and `/costos/ctacteprovresumen` endpoints already used elsewhere, so it becomes a real landing page instead of dead code.

### 7. File/image attachments (facturas `image`/`image2`)
Legacy `ClipboardImageItem` (paste-from-clipboard, base64 round-trip) is rebuilt as a standard file `<input type="file" accept="image/*">` field with drag/paste-drop support via the native Clipboard API's `paste` event (same UX, no antd `message`/`Image` dependency), converting to base64 client-side before submit exactly as the legacy `imageAttributes` handling did — the backend contract (base64 string field) doesn't change.

## Risks / Trade-offs

- [No server-side pagination on any `/costos/*` list endpoint] → Matches legacy behavior (client already loaded full lists); acceptable for current data volumes, but `DataGrid` will do client-side paging/sorting only — flag if any resource grows large enough to need real pagination later.
- [`estimaciones` resource-name/filter fixes change observable behavior vs. the literal legacy app] → Small, explicitly called out; without it we'd ship a page whose filters visibly do nothing, which is worse UX than the fix.
- [Consolidating `planning`/`planning2024` into one dynamic-column screen] → If any current user relies on `planning2024`'s specific frozen 2024 column layout for a reason not visible in code, this could regress; mitigate by verifying the dynamic-columns endpoint (`planning_columnas?anio=2024`) actually returns the same shape before removing the static screen.
- [Google OAuth client ID / backend redirect URIs need registering for this app's domain] → Not something this repo controls; call out explicitly as an environment/deployment setup step, not a code risk.
- [Reduced grid feature set vs ag-Grid (no cell range select, no native Excel-like paste)] → Accepted trade-off per "no new dependencies" goal; Planning/Programación's diff-and-save flow only needs single-cell edits, which plain inputs support.

## Migration Plan

1. Auth + networking scaffolding first (capability `auth`) — nothing else can be tested end-to-end without it.
2. Simple CRUDs next (`proveedores`, `insumos`) to validate the list/create/edit pattern against the real backend.
3. `productos` (adds nested master-detail pattern) then `facturas-gastos` (adds nested Pagos + new Detalle de Insumos).
4. `planning-programacion` (new editable-grid pattern).
5. `reportes-costos` last (depends on proveedores/productos naming/data existing to sanity-check against).
6. No production data migration required — this is a frontend-only change against an already-live backend.
7. Rollback: this repo has no prior production users yet (starter-kit placeholder), so rollback is simply not deploying / reverting the branch.

## Open Questions

- Exact `ProfileResponse` field names from `GET /profile/me` (name/role/etc.) — confirm against `/docs` during `auth` implementation and adjust the `AppLayout` user-menu bindings accordingly.
- Whether Google OAuth redirect URIs for this app's Vercel domain are already registered on the backend's Google Cloud project, or need to be added — deployment-time task, not blocking implementation.
