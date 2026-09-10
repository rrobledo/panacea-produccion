## 1. Verificación previa (base de datos)

- [x] 1.1 Comprobar que no haya filas duplicadas de Programación por producto y fecha: `select producto_id, fecha, count(*) from costos_programacion group by 1,2 having count(*) > 1`. Si aparecen, resolverlas antes de seguir y revisar por qué `update_programacion` (que asume unicidad con `scalar_one_or_none`) no venía fallando (design.md Decision 7) — **26 duplicados encontrados**: todos del producto 112 en diciembre 2024, con `plan=0` y `prod=0` en las dos filas. Inertes: `plan=0` impide que se genere orden, así que la sincronización nunca los toca, y nadie edita diciembre 2024 (por eso el `scalar_one_or_none` no venía fallando). Se dejan como están; borrarlos es una decisión aparte
- [x] 1.2 Confirmar contra la base cuántas celdas `prod` tienen hoy valor cargado a mano en fechas con órdenes finalizadas, para poder decidir después si conviene un backfill (Open Questions) — **0 celdas con valor** en las fechas de las 5 órdenes ya finalizadas (90 filas revisadas): un backfill no pisaría nada. En total hay 7833 celdas E con valor cargado, ninguna en conflicto

## 2. Backend — sincronizar el ejecutado (repo `panacea-produccion-backend`)

- [x] 2.1 En `ordenes_produccion_service.py`, agregar una función de sincronización que reciba la sesión, la fecha de fabricación y los `producto_id` a actualizar, y escriba `costos_programacion.prod`
- [x] 2.2 Calcular el total por producto con una sola consulta agregada: `sum(cantidad_fabricada)` sobre `productos_fabricados` unido a `ordenes_produccion` por `orden_id`, filtrando `fecha_fabricacion = <fecha>` y `estado = 'FINALIZADA'`, con `group by producto_id` (Decision 1 y 8)
- [x] 2.3 Usar `orden.fecha_fabricacion` como fecha, **no** `ProductoFabricado.fecha`, que es el instante del registro (Decision 2)
- [x] 2.4 Sumar solo `cantidad_fabricada`; no incluir `cantidad_desperdicio` (Decision 3)
- [x] 2.5 Asignar el total (no incrementar el valor existente) redondeado a entero con `ROUND_HALF_UP`, reutilizando el criterio de `_redondear_insumo` (Decision 1 y 4) — se agregó `_redondear_ejecutado` con el mismo `ROUND_HALF_UP` pero **sin** el piso de 1 de `_redondear_insumo`: ese piso existe para que un insumo requerido no desaparezca de la orden, y aplicado al ejecutado inventaría producción (0.4 fabricado → 1)
- [x] 2.6 Traer las filas de Programación de esos productos y esa fecha con un `IN` y `order_by(id)`; si hubiera más de una fila para el mismo producto y fecha, escribir solo la primera (Decision 7 y 8)
- [x] 2.7 Omitir sin error el producto que no tenga fila de Programación para esa fecha, y dejar registro en el log del servidor para que el desfase sea diagnosticable (Decision 6)

## 3. Backend — engancharla en la finalización

- [x] 3.1 En `finalizar_orden`, llamar a la sincronización después de agregar los `ProductoFabricado` y de asignar `estado = 'FINALIZADA'`, y **antes** del `commit`, en la misma transacción (Decision 5)
- [x] 3.2 Hacer `await session.flush()` antes de la consulta agregada, para que las filas nuevas y el estado recién asignado se cuenten. Sin esto el ejecutado queda en 0 y nada falla (Decision 5 y Risks)
- [x] 3.3 Deduplicar los `producto_id` de `orden.productos` antes de sincronizar: una orden puede tener dos líneas del mismo producto
- [x] 3.4 Verificar que un fallo de la sincronización deje la transacción sin commitear, de modo que ni el `ProductoFabricado` ni el cambio de estado queden persistidos a medias

## 4. Backend — tests

- [x] 4.1 Test: finalizar una orden con una línea escribe en `prod` la `cantidad_fabricada` de esa línea, en la fila de Programación del producto y la `fecha_fabricacion` de la orden
- [x] 4.2 Test del `flush`: el ejecutado incluye la orden que se está cerrando (no queda en 0 ni en el total anterior). Es el modo de fallar más probable del change (Risks)
- [x] 4.3 Test: la fecha usada es la de fabricación y no la del cierre — finalizar una orden con `fecha_fabricacion` distinta del día actual escribe en la fila de esa fecha y no toca la de hoy
- [x] 4.4 Test: una línea con desperdicio escribe en `prod` solo la `cantidad_fabricada`, y el desperdicio queda únicamente en `productos_fabricados`
- [x] 4.5 Test: una celda `prod` con valor cargado a mano queda reemplazada por el valor real al finalizar
- [x] 4.6 Test de idempotencia: correr la sincronización dos veces para el mismo producto y fecha deja el mismo valor, no el doble
- [x] 4.7 Test: una orden con dos líneas del mismo producto escribe la suma de las dos cantidades fabricadas, una sola vez
- [x] 4.8 Test: `cantidad_fabricada` fraccionaria (p. ej. 10.5) se guarda redondeada con `ROUND_HALF_UP`
- [x] 4.9 Test: si no existe fila de Programación para el producto y la fecha, la orden se finaliza igual, el `ProductoFabricado` se persiste y no se devuelve error
- [x] 4.10 Test: los estados no finalizados no cuentan — una orden en `ASIGNADA` o `EN_PRODUCCION` del mismo producto y fecha no aporta al ejecutado
- [x] 4.11 Test: finalizar no toca `plan` ni el `responsable` de la fila de Programación, ni las filas de otras fechas del mismo producto

## 5. Frontend — avisar que la Programación se actualizó

- [x] 5.1 En `OrdenProduccionDetailPage.jsx`, cambiar el toast de éxito de `finalizar` para que diga también que se actualizó la Programación de la fecha de la orden
- [x] 5.2 Verificar que la columna E de `ProgramacionPage.jsx` muestra el valor nuevo al recargar la pantalla, sin cambios de código: el grid ya pivotea `prod` en `YYYYMMDD-E` — verificado contra los endpoints que el grid consume (`GET /costos/programacion` devuelve `YYYYMMDD-E = 95`; `programacion_columnas` marca la columna `editable`)
- [x] 5.3 Verificar que la celda E sigue editable y que guardarla a mano sigue funcionando como antes (spec `planning-programacion`) — `POST /costos/programacion` con el campo `-E` sigue guardando (test del round-trip)

## 6. Verificación

- [x] 6.1 `pytest` verde en el backend, incluidos los tests nuevos — `pytest tests/unit -q`: **338 passed**, 0 fallos (13 de ellos nuevos, en `tests/unit/test_ordenes_produccion_ejecutado_programacion.py`)
- [x] 6.2 `npm run lint` y `npm run build` verdes, sin errores nuevos respecto de la línea de base (hoy: 14 problemas, 7 errores preexistentes) — lint en la línea de base exacta (14 problemas, 7 errores, ninguno en el archivo tocado) y build OK. Las dos herramientas necesitan Node ≥20.19: con el `node` del PATH (20.2.0) fallan por `util.styleText`, se corrieron con 22.23.2 (problema de entorno preexistente, ajeno a este change)
- [x] 6.3 Recorrido end-to-end: cargar P en la Programación de una fecha, generar la orden, iniciarla, finalizarla con una cantidad distinta de la planeada, y comprobar en la Programación que E quedó con la cantidad fabricada en la celda del día correcto — hecho por los endpoints reales que consume la UI (`test_recorrido_completo_programacion_orden_y_reporte`): P=100 → generar → iniciar → finalizar con 95 → `GET /costos/programacion` devuelve `E=95` en el día de la orden y `None` en el otro día. **No** se corrió el click-through en el navegador: exigiría generar órdenes y movimientos de stock reales contra la base de producción
- [x] 6.4 Recorrido con desperdicio: finalizar con desperdicio y verificar que E no lo incluye y que el desperdicio sí aparece en el listado de Producto Fabricado — 95 fabricadas + 5 de desperdicio: `E=95` (no 100) y `GET /costos/productos_fabricados` muestra las dos cantidades
- [x] 6.5 Verificar en la base que la fila de Programación afectada es exactamente la de `(producto_id, fecha_fabricacion)` y que ninguna otra cambió — comprobado leyendo todas las filas: solo la de la fecha de fabricación tiene `prod`, y `plan` y `responsable` quedan intactos (tests 4.11 y del recorrido completo)
- [x] 6.6 Verificar que el reporte de Producción (`analytics_service`, `sum(prod)`) refleja el ejecutado nuevo y que su `porcentaje_ejecutado` da un número coherente con lo fabricado — `GET /costos/get_produccion_by_category` devuelve planeado 100, producido 95 y `porcentaje_ejecutado` 95.0
