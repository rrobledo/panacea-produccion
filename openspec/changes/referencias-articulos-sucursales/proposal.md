## Why

El vínculo entre lo que se vende en las sucursales (`articulos_final`, el sistema de caja) y lo que se fabrica (`costos_productos`) vive en `costos_productosref`, y hoy no hay ninguna pantalla para mantenerlo: se carga a mano en la base. Cuando un artículo de caja no tiene relación, sus ventas no llegan a `panacea_sales_v2` como producto, y los reportes de precio, planificación y demanda lo pierden sin avisar. Las promos lo agravan, porque un solo artículo de caja equivale a varios productos fabricados, cada uno con su cantidad.

## What Changes

- Nueva pantalla **Referencias de Sucursales** que parte de los artículos activos de `articulos_final` (no de los productos) y muestra, para cada uno, los productos fabricados con los que está vinculado y en qué cantidad.
- Filtro de estado **Pendientes / Vinculados / Todos**, con Pendientes como valor inicial, para ver de un vistazo qué artículos de caja todavía no tienen relación. También filtro por sucursal (derivada del rango de `idarticulo`), por categoría de caja y búsqueda por nombre.
- Indicador de avance: cuántos artículos activos están vinculados sobre el total.
- Edición de la relación de un artículo: agregar uno o más productos fabricados con su cantidad (`unidad_conversion`), cambiar cantidades y quitar líneas. Así se cargan las promos (p. ej. "Promo 6 medialunas + café" → 6 × Medialuna). Se guarda todo el conjunto del artículo de una sola vez.
- Backend (`panacea-produccion-backend`): dos endpoints nuevos bajo `/costos/referencias-articulos`: un listado de artículos con sus relaciones y estado, y un reemplazo atómico de las relaciones de un artículo.
- Sin cambios en el esquema: se usa `costos_productosref` tal como está (`producto_id`, `ref_id` texto, `unidad_conversion` entero). El campo viejo `costos_productos.ref_id` no se toca.

## Capabilities

### New Capabilities
- `referencias-articulos`: listado de los artículos de caja de las sucursales con su estado de vinculación, filtro de pendientes, y alta/edición/baja de su relación (uno o varios productos fabricados, con cantidad) en `costos_productosref`.

### Modified Capabilities
<!-- Ninguna: la pantalla de Productos y sus requisitos no cambian. -->

## Impact

- **Frontend (este repo)**: nueva página `src/pages/referencias-articulos/`, ruta en `src/App.jsx`, entrada de menú en `src/components/layout/AppLayout.jsx`. Reutiliza `DataGrid`, `Modal` y `EntityPicker` (picker de productos sobre `GET /costos/productos?q=`).
- **Backend (`panacea-produccion-backend`)**: router, schema y servicio nuevos; consulta de lectura sobre la vista `articulos_final`; escrituras sólo en `costos_productosref`.
- **Datos aguas abajo**: `panacea_sales_v2` (vía `db/post_migration.sql`), `get_precio_productos` en `costeo_service.py` y los scripts del agente leen `costos_productosref`. Una relación nueva o corregida cambia lo que esos reportes cuentan a partir de la próxima corrida. Es el efecto buscado, pero conviene saberlo.
- **Riesgo de datos**: cualquier `ref_id` no numérico existente haría fallar los joins `ref_id::int` actuales; el listado nuevo tiene que tolerarlo, no romperse.
