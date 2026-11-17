## 1. Relevar los datos actuales

- [x] 1.1 Backend: consulta de diagnóstico (sólo lectura) sobre la base real: total de artículos activos en `articulos_final`, cuántos tienen relación, filas de `costos_productosref` con `ref_id` nulo o no numérico, pares `(ref_id, producto_id)` duplicados, rango de `idarticulo` por tabla de origen (VA / CP / CBA) y si alguna tabla tiene FK hacia `costos_productosref.id`. Anotar los resultados en este change (design, Open Questions)

## 2. Backend: listado

- [x] 2.1 Backend: schemas `RelacionArticuloRead`, `ArticuloReferenciaRead`, `ResumenReferencias` y `ReferenciasArticulosRead` en `app/schemas/referencias_articulos.py`
- [x] 2.2 Backend: helper de sucursal por rango de `idarticulo` (D4) y `listar_articulos(session, estado, sucursal, categoria, q)` en `app/services/referencias_articulos_service.py`, con SQL `text()`: LEFT JOIN tolerante a `ref_id` no numérico (D3), `EXISTS` / `NOT EXISTS` para el estado, y relaciones agrupadas en Python
- [x] 2.3 Backend: `resumen` (total, vinculados, pendientes) calculado sólo con el filtro de sucursal
- [x] 2.4 Backend: `GET /costos/referencias-articulos` en `app/routers/referencias_articulos.py`, registrado en `app/main.py` con prefijo `/costos` y la misma autenticación que el resto de los routers

## 3. Backend: guardado

- [x] 3.1 Backend: `reemplazar_relaciones(session, idarticulo, relaciones)`: 404 si el artículo no está activo; 422 si hay un producto inexistente, `unidad_conversion < 1` o `producto_id` repetido; si pasa la validación, borrar e insertar en la misma transacción con `ref_id = str(idarticulo)`
- [x] 3.2 Backend: `PUT /costos/referencias-articulos/{idarticulo}` que devuelve el artículo actualizado con el formato de un item del listado

## 4. Backend: tests

- [x] 4.1 Backend: fixtures que siembran `articulos_final` (local es tabla), productos y relaciones, incluidos un artículo inactivo, una promo con dos productos y una fila con `ref_id = 'ABC'`
- [x] 4.2 Backend: tests del GET: default pendientes, vinculados, todos, filtro sucursal VA/CP/CBA, categoría, `q`, la promo aparece una sola vez con sus dos relaciones, se omite el inactivo, el `ref_id` inválido no rompe ni se asocia, y el resumen ignora estado/categoría/q pero respeta sucursal
- [x] 4.3 Backend: tests del PUT: alta, reemplazo de una promo, lista vacía (vuelve a pendiente), 422 por producto inexistente sin tocar las filas previas, 422 por cantidad 0 o repetido, y 404 por artículo inactivo o inexistente
- [x] 4.4 Backend: correr la suite completa (`pytest`, una corrida a la vez porque comparte base) y verificar que pasa — 462 passed, 1 failed: `test_precio_productos_uses_current_month_plan_and_articulos_final`, preexistente y ajeno a este cambio (hace INSERT en `articulos_final`, que en la base local sembrada desde producción es una VIEW con UNION). Los 15 tests nuevos pasan

## 5. Frontend: pantalla

- [x] 5.1 Frontend: `src/pages/referencias-articulos/ReferenciasArticulosPage.jsx` con `useList('/costos/referencias-articulos', { estado: 'pendiente' })`, `DataGrid` con columnas Id, Nombre, Categoría, Sucursal, Precio, Productos vinculados (`Nombre × cant, ...`), Estado y acción Vincular/Editar
- [x] 5.2 Frontend: `Select`s de Estado (Pendientes / Vinculados / Todos, default Pendientes), Sucursal (Todas / Villa Allende / Carlos Paz / Córdoba) y Categoría (opciones sacadas de los items), conectados a `filter`
- [x] 5.3 Frontend: indicador de avance en el encabezado a partir de `resumen` ("X de Y vinculados", %, pendientes)
- [x] 5.4 Frontend: ruta `/referencias-articulos` en `src/App.jsx` y entrada "Referencias Sucursales" en `src/components/layout/AppLayout.jsx`, junto a Productos

## 6. Frontend: editor de relación

- [x] 6.1 Frontend: `ReferenciaEditorModal.jsx` con el encabezado del artículo (id, nombre, sucursal, precio) y una lista de líneas editable: `EntityPicker` de productos sobre `GET /costos/productos?q=` mostrando la categoría, input de cantidad, y botones agregar y quitar línea
- [x] 6.2 Frontend: validación en el cliente (cantidad entera ≥ 1, sin productos repetidos) con el error sobre la línea concreta, y botón Guardar deshabilitado mientras haya errores
- [x] 6.3 Frontend: confirmación al guardar con la lista vacía ("el artículo quedará pendiente") y una nota de que la relación afecta los reportes de ventas
- [x] 6.4 Frontend: `PUT /costos/referencias-articulos/{idarticulo}` al guardar; si sale bien, toast, cierre del modal y `refetch`; si da 422/404, toast con `getErrorMessage` y el modal queda abierto

## 7. Verificación

- [x] 7.1 Frontend: lint y build con Node 22 sin errores
- [ ] 7.2 Probar contra el backend local: vincular un pendiente (sale de la lista), cargar una promo con dos productos, cambiar una cantidad, desvincular con lista vacía (vuelve a pendientes), y ver que el indicador de avance se actualiza — **verificado por API** contra la vista real (770 activos): vincular 106 lo saca de pendientes, promo 101 con dos productos, cambio de cantidad, 422 por cantidad 0, lista vacía devuelve 106 a pendiente, el resumen se mueve (0→1→2→1) y respeta sucursal. **Falta** recorrerlo en el navegador
- [x] 7.3 Verificar que `GET /costos/precio_productos` sigue respondiendo con las relaciones cargadas desde la pantalla — responde 200 (en la base de prueba tuve que poner `tiempo_produccion` > 0: `get_cost_by_product` divide por ese campo, fragilidad preexistente). Ver el riesgo de promos en design.md
