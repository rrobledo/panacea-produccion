## Why

`panacea-front` (CRA + antd + ag-Grid) is the production UI for the "costos" business (proveedores, insumos, productos, facturas/gastos, planning, reportes) but it talks to a retired backend (`panacea-one`) and is built on a stack we no longer want to maintain. We're replacing it with this repo's React 19 + Vite enterprise-ui starter, pointed at the new `panacea-produccion-backend` API, in Spanish. While migrating the Facturas/Gastos (ctacteprov) screen we're also closing a real gap: the backend already exposes a per-factura insumos line-item endpoint that the old UI never surfaced, so users currently can't see what materials a factura/gasto is billing for.

## What Changes

- Add Spanish-language authentication (email/password + Google OAuth) modeled directly on `panacea-clubsocios`'s `AuthContext`/`LoginPage`/`OAuthCallback`, talking to the new backend's `/auth/token`, `/auth/google`, `/profile/me` endpoints. **BREAKING**: replaces this repo's placeholder `AuthContext`/`LoginPage`/`OAuthCallback`/`services/api.js` wholesale.
- Add a same-origin API proxy (Vite dev proxy + `vercel.json` rewrites for `/auth`, `/costos`, `/profile`) so the SPA calls relative paths against `panacea-produccion-backend.vercel.app`, avoiding CORS — same pattern as `panacea-clubsocios`.
- Migrate CRUD screens, in Spanish, rebuilt on this repo's existing `DataGrid` (TanStack Table) + `react-hook-form`/`zod` + `ui` component idioms (no antd/ag-Grid/dayjs):
  - Proveedores (list/create/edit)
  - Insumos (list/create/edit)
  - Productos (list/create/edit) with nested Costos (bill-of-materials insumo lines, list/create/edit)
  - Facturas/Gastos — `ctacteprov` (list with date-range/estado filter + totals summary, create/edit) with nested Pagos (payments, list/create/edit)
- Add **new** capability: Detalle de Insumos on the Facturas/Gastos edit screen — when a factura is loaded, show/add/remove its linked `GET/POST/DELETE /costos/ctacteprov/{id}/insumos` line items. This did not exist in `panacea-front`.
- Migrate the editable, server-driven-column grid reports: Planning and Programación (inline cell edit → diffed bulk POST), consolidating `planning.tsx`/`planning2024.tsx` into one dynamic-column implementation.
- Migrate the read-only cost/sales report pages: Producción (categoría/productos/insumos previstos), Ventas por Cliente, Precio Productos, Estimaciones, Costo Materia Prima (+ detail drill-down with its nested insumo breakdown), and a real Dashboard (the legacy `mainDashboard.tsx` was unwired demo code — rebuild it from the same reporting endpoints using `recharts`).
- Explicitly **exclude** Remitos from this migration — it's owned by another module already.
- Replace the starter kit's placeholder nav/routes/demo pages (Dashboard/Charts/Products/Forms/Printable-report samples) with the real business navigation described above.

## Capabilities

### New Capabilities
- `auth`: Email/password + Google OAuth login, JWT session persistence, route guarding, profile fetch — ported from `panacea-clubsocios`.
- `proveedores`: Supplier CRUD (list, create, edit).
- `insumos`: Raw-material CRUD (list, create, edit).
- `productos`: Product CRUD (list, create, edit) plus nested bill-of-materials "costos" sub-resource CRUD.
- `facturas-gastos`: Supplier invoice/expense (`ctacteprov`) CRUD with date/estado filtering and pending/total summary, nested Pagos CRUD, and new nested Detalle de Insumos (view/add/remove line items tied to a factura).
- `planning-programacion`: Server-driven-column editable grids for annual Planning and weekly Programación, with diffed bulk-update save.
- `reportes-costos`: Read-only analytics — Dashboard, Producción, Ventas por Cliente, Precio Productos, Estimaciones, Costo Materia Prima (list + detail drill-down).

### Modified Capabilities
(none — no existing specs in this repo yet)

## Impact

- **Removed**: `src/context/AuthContext.jsx`, `src/components/auth/*`, `src/services/api.js`, `src/pages/{DashboardPage,ChartsPage,ProductsPage,FormPages,PrintableReportPage}.jsx` and their routes/nav entries (starter-kit placeholders).
- **Added**: new `src/pages`/`src/components` for each capability above, `vite.config.js` dev proxy, `vercel.json` rewrites, `.env.example` (`VITE_BACKEND_API_URL`, `VITE_GOOGLE_CLIENT_ID`), Spanish copy throughout.
- **Backend dependency**: `https://panacea-produccion-backend.vercel.app` (`/auth/*`, `/profile/me`, `/costos/*`) — read endpoints are public, write endpoints accept an optional `x-api-key` we will not set (not required); the SPA always sends the user's Bearer token.
- **No new npm dependencies expected**: existing `@tanstack/react-table`, `react-hook-form`, `zod`, `recharts`, `lucide-react`, `date-fns`, `axios` cover all migrated UI; `antd`, `ag-grid-*`, `dayjs`, clipboard-paste image upload are intentionally not carried over and will be rebuilt on native equivalents.
- **Out of scope**: Remitos CRUD/reporting (another module owns it).
