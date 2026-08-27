## Por qué

Hoy no existe stock real en el sistema: `insumos.cantidad` es un campo que se edita a mano, sin ningún movimiento que lo actualice cuando se compra o se produce. Y la Programación semanal no genera ningún documento de trabajo para producción — nadie calcula, el día anterior a fabricar, cuánto insumo hay que separar para el lote del día siguiente, ni queda registro de qué se retiró, cuándo empezó a producirse, qué se terminó fabricando, ni dónde quedó guardado. Además, muchos productos finales se arman a partir de un mismo producto intermedio (p. ej. una masa que después se usa para medialunas o facturas), y hoy no hay forma de modelar esa relación ni de registrar la fabricación de ese intermedio como tal.

## Qué Cambia

- **Producto** gana un campo opcional `producto_base_id`: un vínculo self-referencial a otro Producto (que debe ser intermedio, `is_producto = false`) del que este producto se arma. No se crea una entidad nueva para "masa" — se reutiliza el toggle **Producto Final** (`is_producto`) que ya existe en `ProductoForm.jsx`, hoy sin uso: una masa es simplemente un Producto con ese toggle apagado, con su propio BOM (`costos`) igual que cualquier producto.
- Nuevo **ledger de movimientos de stock de insumos**: `RESERVA`, `CONSUMO`, `AJUSTE`. `insumos.cantidad` pasa a ser el stock resultante de esos movimientos (más un ajuste manual cuando haga falta), no un valor libre.
- Nueva entidad **Orden de Producción**, generada a partir de la Programación del día siguiente (se genera el día anterior a la fecha de fabricación):
  - Agrupa los productos programados para ese día por `producto_base_id` (o por producto individual si no tiene base).
  - Calcula la cantidad total de insumos necesaria y arma la lista de insumos a asignar.
  - Puede producir **más de un producto** en la misma orden, cuando esos productos comparten producto base.
  - Estados: `ASIGNADA` (recién generada, insumos reservados) → `EN_PRODUCCION` (producción retiró los insumos, se confirma el consumo) → `FINALIZADA`.
  - Al pasar a `ASIGNADA` se genera un movimiento `RESERVA` por cada insumo. Al pasar a `EN_PRODUCCION` (retiro físico) se genera un movimiento `CONSUMO` que descuenta `insumos.cantidad`.
  - Al **Finalizar**, se registra por cada producto de la orden — sea final o intermedio — la Cantidad Fabricada real, una Ubicación de destino (elegida de un catálogo de depósitos por sector), y opcionalmente una Cantidad de Desperdicio con su propia Ubicación de Desperdicio (puede ser distinta de la del producto terminado) y su Motivo, quedando un Registro de Producto Fabricado consultable.
  - Cada orden tiene un Código corto legible y se puede imprimir una **oblea** de identificación (fecha de fabricación, código, responsable/área, y producto(s) que rinde) — sin el detalle de insumos, para pegar en bandejas/carros sin exponer la receta.
- Nueva entidad **Ubicación**: catálogo plano de depósitos identificados por sector (p. ej. "Depósito Central - Estante 3", "Cámara - Sector 1"), para saber dónde quedó el producto terminado sin depender de un valor fijo genérico.

## Capacidades

### Capacidades Nuevas
- `ubicaciones`: catálogo CRUD de ubicaciones (depósitos por sector) usado para identificar dónde queda el producto fabricado.
- `stock`: ledger de movimientos de insumo (reserva/consumo/ajuste) y vista de stock disponible vs. reservado.
- `ordenes-produccion`: generación de órdenes desde Programación, asignación de insumos, flujo de estados con reserva/consumo de stock, oblea de identificación, y registro de producto fabricado (cantidad, ubicación, desperdicio) al finalizar.

### Capacidades Modificadas
- `productos`: agrega el campo opcional `producto_base_id` (self-referencial, restringido a productos con `is_producto = false`) para vincular un producto final al producto intermedio del que se arma.
- `insumos`: `cantidad` deja de ser un campo libremente editable y pasa a reflejar el stock resultante de los movimientos registrados por `stock`; se permite un ajuste manual explícito (movimiento `AJUSTE`) en vez de edición directa del número.

## Impacto

- **Backend** (repo separado, controlado por el equipo): `producto_base_id` en `productos`, nuevas tablas/endpoints `ubicaciones`, `stock_movimientos`, `ordenes_produccion` (+ líneas de producto y líneas de insumo asignado), `productos_fabricados` (registro de lo finalizado, con ubicación y desperdicio), y un endpoint on-demand para generar órdenes desde la Programación del día siguiente. Cambia el endpoint de `insumos` (`PUT`) para ya no aceptar `cantidad` como edición libre.
- **Frontend**: nuevas páginas `src/pages/ubicaciones` y `src/pages/ordenes-produccion` (siguiendo el patrón maestro-detalle ya usado en `productos`/`facturas-gastos`), cambios en `InsumoForm.jsx` (quitar edición libre de `cantidad`, agregar acción de "Ajustar stock"), un nuevo campo `producto_base_id` (picker restringido a productos intermedios) en `ProductoForm.jsx`, y un listado nuevo "Producto Fabricado" con columnas de ubicación y desperdicio.
- No reemplaza la Programación existente (`planning-programacion`) — la Orden de Producción solo la lee como disparador.

## Fuera de Alcance (para una etapa siguiente)

- Automatizar la generación diaria de órdenes (cron/scheduler) — en esta etapa puede ser una acción manual ("Generar Órdenes de Mañana") disparada desde la UI.
- Costeo/valorización de movimientos de stock (FIFO, costo promedio, etc.) más allá de lo que ya existe en `productos`/`facturas-gastos`.
- Descuento automático de stock de producto fabricado (final o intermedio) al usarse o venderse — por ahora solo se registra dónde quedó guardado.
- Jerarquía Depósito → Sectores: las ubicaciones son un catálogo plano, sin depósito padre administrado aparte.
- Desperdicio de insumos (materia prima perdida en el proceso) — el desperdicio de esta etapa se mide solo sobre el producto fabricado.
- El comparativo Pedidos vs. Programación y sus alertas — es un cambio aparte (`pedidos-vs-programacion`), del lado de la demanda.
