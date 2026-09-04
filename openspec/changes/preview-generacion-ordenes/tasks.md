## 1. Backend — cálculo compartido y redondeo (repo `panacea-produccion-backend`)

- [x] 1.1 Extender `tests/unit/test_ordenes_produccion.py` con la cobertura que hoy falta sobre `generar_ordenes` antes de tocarla: agrupación por `producto_base_id`, suma de insumos propios de productos con base, y cantidades de insumo resultantes — para tener red antes del refactor (Decision 2, Risks)
- [x] 1.2 Agregar en `app/services/ordenes_produccion_service.py` un helper `_redondear_insumo(cantidad: float) -> int` que aplique half-up con `Decimal(...).quantize(Decimal('1'), rounding=ROUND_HALF_UP)` y devuelva `max(1, ...)` cuando el valor exacto sea `> 0` (Decision 4). No usar el `round()` de Python
- [x] 1.3 Test unitario de `_redondear_insumo`: `1348.666… → 1349`, `0.4 → 1`, `0.0 → 0`, `2.5 → 3`, `1.5 → 2` (los dos últimos fallan con banker's rounding)
- [x] 1.4 Extraer de `generar_ordenes` una función `calcular_ordenes(session, fecha, overrides) -> list[OrdenPreview]` que agrupe, escale la receta y aplique `_redondear_insumo` sobre el **total acumulado** de cada insumo, sin escribir en la sesión (Decision 2 y 4)
- [x] 1.5 Hacer que `calcular_ordenes` aplique los overrides por `programacion_id`: reemplazar `fila.plan` por la cantidad indicada, ignorar overrides de filas que ya no existen, excluir las líneas con cantidad `0` y descartar el grupo entero si queda sin líneas (Decision 3 y 7)
- [x] 1.6 Incluir en cada línea del resultado el `programacion_id` y la `cantidad_programada` original, y en cada orden el `lote_produccion` de la fórmula y el total del grupo (Decision 3, y requisito de comparación contra el lote)
- [x] 1.7 Reescribir `generar_ordenes` como `calcular_ordenes(...)` + persistencia de lo devuelto, dejando la guarda de "ya existen órdenes para esa fecha" fuera del cálculo. Los tests de 1.1 deben quedar verdes, ajustando solo los valores que cambian por el redondeo
- [x] 1.8 Persistir las líneas de insumo y las `RESERVA` con la cantidad ya redondeada, de modo que `OrdenProduccionInsumoLinea.cantidad` y el movimiento de stock coincidan exactamente (spec `stock`)

## 2. Backend — endpoints (repo `panacea-produccion-backend`)

- [x] 2.1 Agregar en `app/schemas/ordenes_produccion.py` los esquemas del preview (`OrdenPreviewRead` con responsable, `lote_produccion`, total del grupo, líneas de producto con `programacion_id`/`cantidad_programada`/`cantidad_planeada`, y líneas de insumo con cantidad entera) y `CantidadOverride { programacion_id, cantidad }`
- [x] 2.2 Extender `GenerarOrdenesRequest` con `cantidades: list[CantidadOverride] | None = None`, manteniendo la compatibilidad con el request actual de solo `fecha` (Migration Plan)
- [x] 2.3 Agregar `POST /costos/ordenes-produccion/preview` en `app/routers/ordenes_produccion.py`, que devuelva `calcular_ordenes(...)` sin persistir y responda `422` si ya existen órdenes para esa fecha
- [x] 2.4 Hacer que `POST /costos/ordenes-produccion/generar` pase los overrides recibidos a `calcular_ordenes`
- [x] 2.5 Tests de endpoint: preview no crea nada (ni orden, ni línea, ni movimiento de stock); preview y generación con los mismos overrides producen cantidades idénticas; generación con override respeta la cantidad editada y deja `Programacion.plan` intacto; override en `0` excluye la línea; grupo sin líneas no genera orden

## 3. Frontend — página de vista previa

- [x] 3.1 Crear `src/pages/ordenes-produccion/GenerarOrdenesPreviewPage.jsx` y registrar la ruta `/ordenes-produccion/generar` en `src/App.jsx` **antes** de `/ordenes-produccion/:id`, para que `generar` no matchee como `:id` (Decision 6)
- [x] 3.2 Cambiar el botón "Generar Órdenes de Mañana" de `OrdenesProduccionPage.jsx` para que navegue a esa ruta en lugar de llamar a `generar`, y quitar de esa página el `useMutation` de generación
- [x] 3.3 Pedir el preview al montar con la fecha de mañana (`addDays(new Date(), 1)`, como hoy), manejando carga con `PageLoader`, error con `ErrorState`, y el caso de preview vacío con `EmptyState`
- [x] 3.4 Renderizar una tarjeta por orden a generar: responsable, líneas de producto (Producto, Cantidad Planeada editable) y líneas de insumo (Insumo, Cantidad entera, Unidad de Medida)
- [x] 3.5 Mostrar por orden el bloque de comparación — Lote de Producción de la fórmula, total planificado del grupo, y diferencia — y aplicar el resaltado en rojo cuando el total sea estrictamente menor al lote (Decision 5)
- [x] 3.6 Hacer editable la Cantidad Planeada por línea (entero, `min=0`), recalculando **localmente y sin latencia** el total del grupo, la diferencia y la marca roja (Decision 5)
- [x] 3.7 Refrescar los insumos pidiendo el preview de nuevo con los overrides actuales, usando el `useDebounce` de `src/hooks/index.js` a 400 ms, e indicando visualmente que los insumos se están recalculando (Decision 5)
- [x] 3.8 Marcar visualmente cada línea cuya cantidad difiera de su `cantidad_programada`, con una leyenda que aclare que la Programación no se modifica
- [x] 3.9 Bloquear la confirmación ante cantidades inválidas (no enteras o negativas) mostrando el error de validación
- [x] 3.10 Botón "Confirmar y Generar": `POST /costos/ordenes-produccion/generar` con `fecha` + `cantidades`, toast de éxito, y navegación de vuelta al listado; botón "Cancelar" que vuelve sin generar nada
- [x] 3.11 Mostrar el error del backend tal cual cuando ya existan órdenes para esa fecha

## 4. Frontend — cantidades sin decimales

- [x] 4.1 Agregar en `src/utils/` un helper de formato de cantidad de insumo que redondee a 0 decimales al mostrar, y usarlo en la vista previa
- [x] 4.2 Aplicarlo a la tabla de Insumos de `OrdenProduccionDetailPage.jsx`, para que las órdenes viejas con decimales guardados se muestren redondeadas sin alterar el valor almacenado (Decision 8)
- [x] 4.3 Revisar `OblejaPrint.jsx`: hoy no imprime insumos, así que solo corresponde tocarlo si el redondeo alcanza alguna cantidad visible en la oblea

## 5. Verificación

- [x] 5.1 `pytest` verde en el backend, incluidos los tests nuevos de redondeo, preview y overrides
- [x] 5.2 `npm run lint` y `npm run build` verdes en el frontend, sin errores nuevos respecto de la línea de base
- [x] 5.3 Prueba manual del recorrido completo: abrir el preview, ver una orden por debajo del lote en rojo, editar una cantidad, verificar que los insumos se recalculan y que la línea queda marcada como divergente, confirmar, y comprobar que la orden creada coincide exactamente con lo previsualizado
- [x] 5.4 Verificar en la base que, para una orden recién generada, la cantidad de cada línea de insumo es entera y coincide con su movimiento de `RESERVA`
- [x] 5.5 Verificar que después de confirmar con cantidades editadas, las filas de `Programacion` conservan su `plan` original
