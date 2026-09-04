## Why

Generar órdenes es hoy una operación de una sola oportunidad por día. Si se generó para el 4 y después se agrega un producto a la Programación de ese mismo día, el sistema responde *"Ya existen órdenes de producción generadas para 2026-09-04"* y no hay forma de generar lo que falta: la única salida es cancelar las órdenes del día una por una y rehacer todo. Y cancelar tampoco borra nada — la orden queda ahí, ensuciando el listado y el tablero semanal con documentos que nunca se van a producir.

Las dos cosas son la misma carencia vista de dos lados: **no hay forma de corregir un día ya generado**.

## What Changes

- **Borrar una Orden de Producción.** Se agrega la acción en el detalle de la orden, con confirmación. Solo se pueden borrar las órdenes en estado **Asignada** o **Cancelada**: una En Producción ya consumió insumos y una Finalizada tiene registro de producto fabricado, así que borrarlas dejaría el stock mal contado o directamente rompería la integridad referencial. Al borrar se eliminan también sus líneas de producto e insumo y sus movimientos de **RESERVA**, de modo que el historial del insumo no quede con reservas apuntando a una orden inexistente.
- **La generación deja de rechazar un día ya generado.** En vez del error, el sistema compara la Programación de esa fecha contra lo que ya tienen las órdenes existentes de ese día, y **previsualiza solo los productos pendientes de generar**. Confirmar crea únicamente las órdenes que faltan; las que ya existen quedan intactas.
- **Una orden cancelada libera sus productos.** Sus productos vuelven a contar como pendientes y se pueden generar de nuevo, coherente con que cancelar ya libera la reserva de insumos. Las órdenes en Asignada, En Producción y Finalizada sí cubren sus productos.
- **La vista previa dice qué está pasando.** Cuando la fecha ya tiene órdenes, lo indica y muestra cuántas hay; y si no queda nada pendiente, lo informa en vez de mostrar una pantalla vacía sin explicación.
- **BREAKING (corrección) — la numeración de códigos deja de reiniciarse.** Hoy el código se arma como `AAMMDD-NN` con `NN` empezando en 01 en cada generación. Al permitir generar dos veces el mismo día, eso produciría **códigos duplicados**, y como `ordenes_produccion.codigo` no tiene índice único no fallaría: los crearía en silencio. La numeración pasa a continuar desde el mayor código existente de esa fecha, y se agrega un índice único sobre `codigo` para que un error así no pueda volver a pasar inadvertido.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

> Nota de dependencia: `ordenes-produccion` sigue sin estar en `openspec/specs/`. La introduce `ordenes-produccion-stock` y la extienden `preview-generacion-ordenes`, `preview-lista-e-impresion-orden` y `reporte-semanal-ordenes`, **ninguno archivado**. Este change modifica requisitos definidos en los dos primeros.

- `ordenes-produccion`: se agrega el borrado de una orden; y la previsualización y la generación pasan de rechazar una fecha ya generada a calcular y ofrecer solo lo pendiente. Se modifican los requisitos de previsualización y de generación, y el de código, que ahora debe ser único y continuar la numeración del día.
- `stock`: al borrar una orden se eliminan sus movimientos de `RESERVA`. El comprometido no cambia de definición — se sigue calculando desde las líneas de órdenes en `ASIGNADA`, así que borrar la orden ya lo libera por sí solo.

## Impact

- **Backend** (`panacea-produccion-backend`, repo separado):
  - `DELETE /costos/ordenes-produccion/{id}`, restringido por estado.
  - `calcular_ordenes` pasa a excluir los productos ya cubiertos por órdenes existentes de esa fecha, y `validar_fecha_sin_ordenes` desaparece de los caminos de preview y generación.
  - La numeración del código continúa desde el máximo del día.
  - Migración nueva: índice único sobre `ordenes_produccion.codigo`. Hoy no hay duplicados, así que se puede crear sin limpieza previa.
- **Frontend** (este repo):
  - `OrdenProduccionDetailPage.jsx`: acción "Borrar" con confirmación, visible solo en los estados que la permiten.
  - `GenerarOrdenesPreviewPage.jsx`: se quita el tratamiento del error de fecha ya generada y se agrega el aviso de "ya hay N órdenes para esta fecha" y el estado de "no queda nada pendiente".

## Fuera de Alcance

- Borrado masivo de las órdenes de un día.
- Deshacer un borrado, o papelera de reciclaje.
- Regenerar una orden existente para reflejar un cambio de cantidad en la Programación: este change solo agrega lo que falta, no reconcilia lo que ya existe.
- Cambiar el criterio de agrupación de órdenes.
