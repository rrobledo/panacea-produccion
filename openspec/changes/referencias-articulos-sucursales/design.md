## Context

- `articulos_final` es una **vista** de producción que une las tablas de artículos de los sistemas de caja de cada sucursal (`articulos`, `articulos_cp`, `articulos_cba`). Expone `idarticulo`, `nombre`, `idcategoria`, `categoria`, `precio` y `activo`. Por convención, `idarticulo < 2000` es Villa Allende y `>= 2000` es Carlos Paz. Localmente existe como tabla en `panacea-produccion-backend/docker/init-db/03_productos_costeo.sql`.
- `costos_productosref` (`id`, `producto_id` → `costos_productos.id`, `ref_id` VARCHAR(250), `unidad_conversion` INTEGER default 1) ya modela una relación N:M: un artículo de caja puede tener varias filas (promos) y un producto puede estar en varios artículos (uno por sucursal, más las promos). El modelo SQLAlchemy `ProductosRef` ya existe en `app/models/productos.py`, pero no hay router ni schema.
- `unidad_conversion` ya se interpreta como "unidades de producto por unidad de artículo vendida": `panacea_sales_v2` y los scripts del agente calculan `count * unidad_conversion`. Por eso es el lugar natural para la "cantidad" de una promo, sin agregar columnas.
- Quien lee `costos_productosref` hoy: la vista de ventas en `db/post_migration.sql` (`a.idarticulo = r.ref_id::int`) y `get_precio_productos` en `costeo_service.py` (`cp.ref_id::int = af.idarticulo`).
- El frontend llama al backend FastAPI con `api` (axios) bajo el prefijo `/costos`. Los listados usan `useList` + `DataGrid`, y las líneas de detalle siguen el patrón de `CostosLinesEditor.jsx` (`Modal` + `EntityPicker`).

## Goals / Non-Goals

**Goals:**
- Que alguien de producción pueda, sin tocar la base, ver qué artículos de caja no tienen producto fabricado asociado y cargarles la relación, incluidas las promos con cantidades.
- Partir del artículo de caja (lo que se vende) y no del producto, porque la pregunta es "¿qué se está vendiendo que no sé qué es?".
- Guardar la relación de un artículo como un todo, de forma atómica.

**Non-Goals:**
- No cambia el esquema de `costos_productosref` ni de `costos_productos`. El campo viejo `costos_productos.ref_id` queda como está.
- No se editan artículos de caja (nombre, precio, activo): `articulos_final` es de sólo lectura.
- No se recalcula `panacea_sales_v2` ni ningún reporte: toman la relación nueva en su próxima corrida.
- No se marcan artículos como "no aplica" (bebidas de reventa, etc.). Ver Open Questions.
- No se agrega gestión de relaciones desde la pantalla de Producto.

## Decisions

### D1. Dos endpoints nuevos con el artículo como recurso
`GET /costos/referencias-articulos` y `PUT /costos/referencias-articulos/{idarticulo}`, en un router nuevo `app/routers/referencias_articulos.py` con su servicio y schema.

- **GET** acepta `estado` (`pendiente` | `vinculado` | `todos`, default `pendiente`), `sucursal` (`VA` | `CP` | `CBA`), `categoria` y `q` (ilike sobre el nombre). Devuelve `{ resumen: { total, vinculados, pendientes }, items: [ { idarticulo, nombre, categoria, sucursal, precio, estado, relaciones: [ { id, producto_id, producto_nombre, unidad_conversion } ] } ] }`. El `resumen` se calcula sólo con el filtro de sucursal, para que el avance no cambie al buscar.
- **PUT** recibe `{ relaciones: [ { producto_id, unidad_conversion } ] }` y devuelve el artículo con el mismo formato que un item del GET.

*Alternativa descartada*: un CRUD por fila (`POST/PUT/DELETE /productosref/{id}`). Obliga al front a orquestar varias llamadas por promo y deja estados intermedios a medio guardar si una falla. El patrón "staged + varias llamadas" de `ProductoCreatePage` ya mostró ese problema.

### D2. PUT como reemplazo del conjunto completo, en una transacción
El servicio valida todo primero: artículo activo (si no, 404), productos existentes, `unidad_conversion >= 1` y sin `producto_id` repetidos (si no, 422). Recién entonces, dentro de la misma transacción, borra las filas con ese `ref_id` e inserta las nuevas. Una lista vacía deja el artículo pendiente.

*Por qué reemplazar y no hacer un diff*: el conjunto de un artículo es chico (1 a 5 filas). Que haya ids nuevos no le importa a nadie: ninguna tabla referencia `costos_productosref.id`. Hay que confirmarlo en la tarea 1.1.

### D3. Join tolerante a `ref_id` no numérico
La consulta del GET une con `r.ref_id ~ '^[0-9]+$' AND r.ref_id::int = a.idarticulo`, o con la comparación en texto `r.ref_id = a.idarticulo::text`. Gana la que use índice o sea más simple, porque los volúmenes son chicos. Así una fila sucia no tumba la pantalla, como pasaría con el `::int` directo que usan las consultas existentes. Al escribir, `ref_id` siempre se guarda como `str(idarticulo)`, el mismo formato que ya envía `ProductoForm` desde el commit `e8d825f`.

### D4. Sucursal derivada del rango de `idarticulo`
La vista `articulos_final` desplaza los ids: `articulos` queda tal cual, `articulos_cp` suma 2000 y `articulos_cba` suma 4000 (verificado con `pg_get_viewdef` en la tarea 1.1). Por eso la regla es `< 2000` → `VA`, `< 4000` → `CP`, resto → `CBA`. `get_precio_productos` usa una regla de dos tramos (`>= 2000` = CP) que mete Córdoba dentro de Carlos Paz; ese reporte queda fuera de alcance. La regla se centraliza en un helper del servicio.

### D5. Una consulta SQL para el listado, no ORM
`articulos_final` es una vista sin modelo ORM, y el listado necesita agregar las relaciones por artículo. Se usa `text()` como en `costeo_service.get_precio_productos`: un `LEFT JOIN` de artículos con relaciones y productos, y el agrupado en Python, lo que evita depender de `json_agg` en tests. Los filtros de estado se aplican en SQL con `EXISTS` / `NOT EXISTS`.

### D6. Frontend: grilla con filtros y editor en modal
- Página `src/pages/referencias-articulos/ReferenciasArticulosPage.jsx`, ruta `/referencias-articulos`, entrada de menú "Referencias Sucursales" junto a Productos en `AppLayout.jsx`.
- Encabezado con el indicador de avance (`vinculados / total`, %, pendientes).
- `DataGrid` con `Select`s de Estado (default Pendientes), Sucursal y Categoría en `actions`, más la búsqueda propia de la grilla. Los filtros que van al backend usan `useList(...).filter`.
- Columna "Productos vinculados" como texto `Nombre × cant, ...`. Botón "Vincular" en pendientes y "Editar" en vinculados.
- `ReferenciaEditorModal.jsx`: muestra el artículo (id, nombre, sucursal, precio) y la lista de líneas con `EntityPicker` sobre `GET /costos/productos?q=` (habilitados) y un input numérico de cantidad, con botones agregar y quitar. Valida en el cliente cantidad entera ≥ 1 y que no haya productos repetidos. Pide confirmación al guardar con la lista vacía, porque desvincula el artículo. Al guardar con éxito, cierra, avisa con un toast y hace `refetch`.

*Alternativa descartada*: edición inline en la grilla. Las promos con varias líneas no entran cómodas en una celda, y el patrón de modal ya existe en `CostosLinesEditor`.

### D7. Picker de productos: habilitados, sin filtrar por naturaleza
Se usa el `GET /costos/productos` existente (`q`, `solo_habilitados=true`). No se filtra por `vendible` ni por `is_producto` porque hay casos reales de semielaborados que se venden (brownie, ver `masa-procesos-y-maquinaria`). El picker muestra la categoría para desambiguar.

## Risks / Trade-offs

- **[Artículos que nunca van a tener producto]** (bebidas, reventa, recibos) quedan para siempre en Pendientes y ensucian el indicador → Mitigación: el filtro por categoría permite excluirlos visualmente. Si molesta, marcar "no aplica" queda como change aparte (Open Questions).
- **[Cambiar una relación cambia los reportes históricos]**: `panacea_sales_v2` se reconstruye con la relación vigente, así que corregir una promo cambia las cantidades de meses pasados → Se acepta: es el comportamiento actual de cargar la relación a mano. Se avisa en el texto de ayuda del editor.
- **[Filas duplicadas preexistentes]** (mismo `ref_id` y `producto_id` dos veces) → El GET las muestra tal cual. El primer guardado desde la pantalla las consolida, porque el PUT rechaza repetidos y el usuario tiene que unificarlas.
- **[`ref_id` no numéricos existentes]** siguen rompiendo las consultas viejas con `::int` → Fuera de alcance arreglarlas. La tarea 1.1 los cuenta y, si hay, se reportan para limpiarlos a mano.
- **[Promos en `get_precio_productos`]** (observado en la tarea 7.3): ese reporte toma, por producto, el primer artículo vinculado por `idarticulo` (`order by idarticulo limit 1`). Si una promo tiene un id más bajo que el artículo propio del producto, el reporte muestra el nombre y el precio de la promo como si fueran del producto → No se cambia en este change. Arreglo sugerido aparte: preferir la relación con `unidad_conversion = 1`, o excluir los artículos que tienen más de una relación.
- **[Rango de sucursal hardcodeado]** → Centralizado en un helper (D4). Si aparece una tercera sucursal, el cambio es de una línea.
- **[Rendimiento de la vista]**: `articulos_final` es un UNION de tres tablas → Unos cientos de filas, sin paginación. Si crece, se pagina después.

## Migration Plan

1. Deployar el backend con los endpoints nuevos. Son aditivos: no rompen nada existente.
2. Deployar el frontend con la pantalla y el menú.
3. Rollback: revertir el front (se va la pantalla) y el backend (se van los endpoints). Los datos cargados en `costos_productosref` son válidos con o sin la pantalla, así que no hay que deshacer nada.

## Open Questions

- **¿Hace falta marcar artículos como "no aplica"?** Requeriría una tabla o columna nueva (p. ej. `costos_articulosref_ignorados`). Propuesta: arrancar sin eso, medir cuántos pendientes son reventa y decidir.
- ~~¿Cuál es el rango de `idarticulo` de Córdoba?~~ Resuelto en la tarea 1.1: `idarticulo + 4000`.

### Diagnóstico (tarea 1.1, base local sembrada desde producción, 2026-11-17)
- `articulos_final`: 1335 artículos, 770 activos (VA 259, CP 287, CBA 224).
- 556 de los 770 activos tienen categoría "Otros". El riesgo de los "pendientes eternos" es real, y el filtro por categoría ayuda poco cuando casi todo cae en "Otros".
- Ninguna tabla tiene una FK hacia `costos_productosref.id`. El reemplazo de D2 es seguro. La tabla sólo tiene índices en `id` y `producto_id`.
- No se pudo medir `ref_id` sucio ni duplicados: en la base local `costos_productosref` está vacía (la truncan los tests). Hay que correr la consulta de diagnóstico contra producción antes del deploy.
- **¿`unidad_conversion` siempre entera?** El esquema es INTEGER. Si aparece una promo que necesite fracciones (p. ej. ½ kg de un producto en KG), hace falta una migración a NUMERIC y revisar `panacea_sales_v2`. Por ahora se valida entero ≥ 1.
