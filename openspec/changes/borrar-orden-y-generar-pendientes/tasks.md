## 1. Backend — código único y numeración continua (repo `panacea-produccion-backend`)

- [x] 1.1 Verificar en producción que no haya códigos duplicados antes de migrar: `SELECT codigo, count(*) FROM ordenes_produccion GROUP BY codigo HAVING count(*) > 1`
- [x] 1.2 Migración `migrations/00NN_ordenes_produccion_codigo_unico.sql` con un índice único sobre `ordenes_produccion.codigo`, y `unique=True` en el modelo (Decision 3)
- [x] 1.3 En `generar_ordenes`, reemplazar el `enumerate(previews, start=1)` por una numeración que arranque en el mayor sufijo ya emitido para esa fecha más uno, contando **todas** las órdenes del día incluidas las canceladas
- [x] 1.4 Ignorar los códigos que no matcheen `AAMMDD-NN` al calcular el máximo, para que un formato inesperado no rompa la generación (Decision 3)
- [x] 1.5 Test: generar dos veces la misma fecha produce `-01` y después `-02`, sin repetir; y con una orden cancelada de por medio la numeración igual sigue hacia adelante

## 2. Backend — generar solo lo pendiente

- [x] 2.1 En `calcular_ordenes`, consultar las órdenes existentes de la fecha en estados `ASIGNADA`, `EN_PRODUCCION` y `FINALIZADA`, y armar el conjunto de `producto_id` ya cubiertos (Decision 1 y 2)
- [x] 2.2 Descartar de los grupos las filas de Programación cuyo producto ya esté cubierto, antes de agrupar y explotar la receta
- [x] 2.3 Excluir explícitamente las órdenes `CANCELADA` del conjunto de cobertura: sus productos vuelven a estar pendientes
- [x] 2.4 Dejar de llamar a `validar_fecha_sin_ordenes` desde `preview_ordenes` y `generar_ordenes`; eliminarla si no queda ningún otro llamador, para no dejar código muerto
- [x] 2.5 Exponer en la respuesta del preview cuántas órdenes ya existen para esa fecha, para que el frontend pueda avisarlo
- [x] 2.6 Tests: fecha ya generada devuelve solo lo pendiente; agregar un producto a la Programación de un día generado y generarlo crea solo esa orden dejando las anteriores intactas; una orden cancelada devuelve sus productos a pendientes; una fecha con todo cubierto devuelve vacío y no crea nada

## 3. Backend — borrar una orden

- [x] 3.1 `DELETE /costos/ordenes-produccion/{orden_id}` en el router, y `eliminar_orden` en el servicio
- [x] 3.2 Permitir el borrado solo en `ASIGNADA` y `CANCELADA`; rechazar `EN_PRODUCCION` y `FINALIZADA` con 422 y un mensaje que explique por qué (Decision 4)
- [x] 3.3 Borrar los movimientos `RESERVA` de la orden por `referencia = codigo`, en la misma transacción que borra la orden. Depende del índice único de 1.2: sin él un código repetido se llevaría puestas las reservas de otra orden (Decision 5)
- [x] 3.4 Verificar que las líneas de producto e insumo se van con la orden por el `ON DELETE CASCADE` que ya existe, sin borrarlas a mano
- [x] 3.5 Tests: borrar una `ASIGNADA` la elimina con sus líneas y reservas; borrar una `CANCELADA` también; `EN_PRODUCCION` y `FINALIZADA` devuelven 422 y la orden sigue existiendo; el Comprometido del insumo baja tras el borrado y su Cantidad física no cambia
- [x] 3.6 Test: borrar una orden y volver a generar esa fecha ofrece de nuevo sus productos como pendientes

## 4. Frontend — borrar desde el detalle

- [x] 4.1 Acción "Borrar" en `OrdenProduccionDetailPage.jsx`, visible solo cuando el estado es `ASIGNADA` o `CANCELADA`
- [x] 4.2 Confirmación con `ConfirmDialog` que nombre la orden por su código y aclare que la acción no se puede deshacer
- [x] 4.3 Al confirmar, `DELETE` al endpoint, toast de éxito y navegación de vuelta al listado
- [x] 4.4 Mostrar el error del backend tal cual si el borrado se rechaza

## 5. Frontend — el preview deja de tratar la fecha como bloqueada

- [x] 5.1 Quitar de `GenerarOrdenesPreviewPage.jsx` el manejo del error "ya existen órdenes": ese caso ya no llega como error
- [x] 5.2 Avisar, cuando la fecha ya tiene órdenes, cuántas hay y que lo previsualizado es solo lo pendiente
- [x] 5.3 Distinguir "no hay nada programado para esa fecha" de "ya está todo generado", que hoy se verían igual (Decision 6)
- [x] 5.4 Verificar que el selector de fecha sigue usable en ambos casos, que fue lo que motivó que el encabezado se renderice siempre

## 6. Verificación

- [x] 6.1 `pytest` verde en el backend, incluidos los tests nuevos de numeración, pendientes y borrado
- [x] 6.2 `npm run lint` y `npm run build` verdes, sin errores nuevos respecto de la línea de base (hoy: 14 problemas, 7 errores preexistentes)
- [x] 6.3 Recorrido end-to-end: generar un día, agregar un producto a la Programación de ese día, volver al preview y comprobar que aparece solo el producto nuevo, confirmarlo, y verificar que las órdenes anteriores siguen intactas
- [x] 6.4 Verificar en la base que los códigos de las dos generaciones no se repiten y que la numeración continuó
- [x] 6.5 Recorrido de borrado: borrar una orden `ASIGNADA` desde el detalle y verificar que desaparece del listado y del tablero semanal, que sus líneas y reservas ya no están, y que el Comprometido del insumo bajó
- [x] 6.6 Verificar que el borrado no se ofrece ni se acepta en `EN_PRODUCCION` ni en `FINALIZADA`
- [x] 6.7 Verificar que tras borrar una orden, esa fecha vuelve a ofrecer sus productos como pendientes
