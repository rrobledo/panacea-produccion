## Why

La Programación tiene dos columnas por día: **P** (lo planeado) y **E** (lo ejecutado). La P la carga el usuario y de ahí salen las órdenes de producción; la E hoy **solo se puede llenar a mano**, aunque el sistema ya sabe exactamente cuánto se fabricó — al finalizar una orden se registra `cantidad_fabricada` por producto en `productos_fabricados`.

El resultado es que la única comparación plan-contra-realidad del sistema depende de que alguien transcriba a mano un número que el sistema ya tiene. En la práctica la columna E queda vacía o desactualizada, y la Programación deja de servir para ver qué se cumplió.

## What Changes

- **Finalizar una orden actualiza la Programación.** En la misma operación que registra los productos fabricados, el sistema escribe la columna **E** de la Programación de cada producto de la orden, para la fecha de fabricación de la orden.
- **E cuenta lo fabricado, no el desperdicio.** El valor es `cantidad_fabricada`; `cantidad_desperdicio` no se suma. El desperdicio ya se registra aparte en `productos_fabricados` con su ubicación y motivo, y lo que la Programación compara contra el Plan es el rendimiento útil.
- **El valor se recalcula, no se incrementa.** E pasa a ser la suma de `cantidad_fabricada` de todas las órdenes **finalizadas** de ese producto y esa fecha. Es idempotente: volver a calcularlo da el mismo número, y un valor cargado a mano queda reemplazado por el real.
- **La actualización no puede bloquear la finalización.** Si la Programación no tiene fila para ese producto y fecha (una orden reasignada de fecha, una fila borrada), la orden se finaliza igual y esa fila simplemente no se escribe. Finalizar es el registro de lo que pasó en planta; no puede fallar por un tema de libro mayor.
- **La columna E sigue siendo editable.** El usuario puede corregirla a mano como hoy — la finalización pone el número real, no lo congela.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

> Nota de dependencia: `ordenes-produccion` todavía **no está en `openspec/specs/`**. La introduce `ordenes-produccion-stock` y la extienden `preview-generacion-ordenes`, `preview-lista-e-impresion-orden`, `reporte-semanal-ordenes` y `borrar-orden-y-generar-pendientes`, **ninguno archivado**. Este change modifica el requisito de finalización definido en el primero.

- `ordenes-produccion`: finalizar una orden pasa a tener un efecto adicional además de registrar los productos fabricados — sincroniza la cantidad ejecutada en la Programación de la fecha de la orden. Se modifica el requisito de finalización.
- `planning-programacion`: la columna E (Ejecutado) deja de ser un dato exclusivamente manual: el sistema la escribe al finalizar una orden, y sigue siendo editable por el usuario. Se modifica el requisito de edición de la Programación.

## Impact

- **Backend** (`panacea-produccion-backend`, repo separado):
  - `finalizar_orden` en `ordenes_produccion_service.py` sincroniza la Programación dentro de la misma transacción que crea los `ProductoFabricado` y cambia el estado.
  - El cálculo del ejecutado se apoya en `productos_fabricados` unido a `ordenes_produccion` por `fecha_fabricacion`, no en el payload de finalización, para que el número sea reproducible.
  - `costos_programacion.prod` es `INTEGER` y `productos_fabricados.cantidad_fabricada` es `FLOAT`: hay que definir el redondeo. Sin migración de datos ni de esquema.
- **Frontend** (este repo):
  - Sin cambios funcionales obligatorios: `ProgramacionPage.jsx` ya muestra `prod` en la columna E y la refetchea. El único cambio es de comunicación en `FinalizarOrdenSection.jsx` / `OrdenProduccionDetailPage.jsx`, para que el usuario sepa que al finalizar se actualizó la Programación.
- **Sin migraciones.** Se usan columnas y tablas que ya existen.

## Fuera de Alcance

- Recalcular la Programación de órdenes ya finalizadas antes de este change (backfill). Se menciona en el design como opción operativa, pero no es parte de la implementación.
- Reabrir una orden finalizada, o deshacer la finalización y con ella el ejecutado.
- Escribir la columna E desde ajustes de stock de producto terminado o desde cualquier otro origen que no sea finalizar una orden.
- Cambiar el tipo de `costos_programacion.prod` a decimal para admitir fracciones.
- Crear la fila de Programación faltante cuando no existe.
- Emparejar la línea de orden con la fila exacta de Programación de la que salió (la línea guarda `producto_id`, no `programacion_id`).
