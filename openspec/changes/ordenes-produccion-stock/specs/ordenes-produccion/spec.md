## ADDED Requirements

### Requirement: Generate Órdenes de Producción from Programación
The system SHALL let a user generate Órdenes de Producción for a given fecha de fabricación, one day ahead of that date, by grouping the productos scheduled in Programación for that date by (`producto_base_id`, Responsable) — productos with no `producto_base_id` each form their own single-producto group — computing the total quantity needed per group, and exploding the corresponding BOM (the producto base's own Costos when the group shares one, or each producto's own Costos when it has no base) scaled to that quantity. Each generated order inherits its Responsable/Área and receives a short Código from that group.

#### Scenario: Generate orders for tomorrow
- **WHEN** a user opens "Órdenes de Producción" and clicks "Generar Órdenes de Mañana"
- **THEN** the system SHALL request generation for the next calendar date, creating one Orden de Producción per (producto_base/producto, Responsable) group found in that date's Programación, each in estado `ASIGNADA`, and SHALL display the resulting orders

#### Scenario: Multiple productos share a producto base
- **WHEN** two or more productos scheduled for the same date share the same `producto_base_id` (e.g. medialunas and facturas both based on the same masa)
- **THEN** the system SHALL create a single Orden de Producción listing every one of those productos as separate producto-lines, with one shared set of insumo-lines sized to their combined quantity

#### Scenario: No productos scheduled for that date
- **WHEN** a user requests generation for a date with no Programación rows
- **THEN** the system SHALL show an empty result rather than creating any order

### Requirement: View Orden de Producción
The system SHALL assign every Orden de Producción a short, human-readable Código (e.g. `OP-20260822-01`) at generation time, and SHALL display a list of Órdenes de Producción (`GET /costos/ordenes_produccion`), filterable by Fecha de Fabricación and Estado, and a detail view per order showing its Código, Responsable/Área, producto-lines (Producto, Cantidad Planeada) and insumo-lines (Insumo, Cantidad Asignada, Unidad de Medida).

#### Scenario: View order list
- **WHEN** a user opens "Órdenes de Producción"
- **THEN** the system SHALL display Código, Fecha de Fabricación, Producto Base/Producto, Responsable/Área, Estado, and cantidad de productos, filterable by date range and estado

#### Scenario: View order detail
- **WHEN** a user opens a specific order
- **THEN** the system SHALL display its Código, Responsable/Área, producto-lines, and insumo-lines read-only

### Requirement: Print Oblea de Orden de Producción
The system SHALL allow printing a single compact "oblea" (identification tag) per Orden de Producción, showing only Fecha de Fabricación (fecha prevista de ejecución), Código de la orden, Responsable/Área, and the nombre(s) of the producto(s) it will yield — explicitly excluding all insumo-line detail — using the browser print dialog scoped to that content, following the same print pattern already used in `reportes-costos`.

#### Scenario: Print oblea for a single-producto order
- **WHEN** a user opens an Orden de Producción's detail and clicks "Imprimir Oblea"
- **THEN** the system SHALL open the browser print dialog showing Fecha de Fabricación, Código, Responsable/Área, and the Producto, with no insumo data

#### Scenario: Print oblea for an order with multiple productos
- **WHEN** the order has more than one producto-line (productos sharing the same producto base)
- **THEN** the single printed oblea SHALL list all of their nombres together, rather than printing a separate oblea per producto

#### Scenario: Insumo detail never appears on the oblea
- **WHEN** a user prints the oblea for any order
- **THEN** the system SHALL NOT include insumo names, quantities, or units on the printed content, even though the order's own detail view shows that information elsewhere

### Requirement: Start Production (Retiro de Insumos)
The system SHALL allow transitioning an Orden de Producción from `ASIGNADA` to `EN_PRODUCCION`, recording a `CONSUMO` stock movement for each of its insumo-lines (replacing the corresponding `RESERVA`) at the moment of transition.

#### Scenario: Confirm retiro and start production
- **WHEN** a user opens an order in estado `ASIGNADA` and confirms "Iniciar Producción"
- **THEN** the system SHALL change the order's estado to `EN_PRODUCCION` and create a `CONSUMO` movement for each insumo-line, deducting it from the insumo's Cantidad

#### Scenario: Insufficient physical stock at retiro time
- **WHEN** a user confirms "Iniciar Producción" but an insumo's current Cantidad is less than the reserved amount
- **THEN** the system SHALL show an error identifying the shortfall and SHALL NOT transition the order's estado

### Requirement: Register Producto Fabricado and Finalize
The system SHALL, when a user finalizes an Orden de Producción in `EN_PRODUCCION`, require entering — for each of its producto-lines — the Cantidad Fabricada actually obtained (which may differ from the planned Cantidad) with an Ubicación de destino for that good output (selected via the ubicaciones search picker), and an optional Cantidad de Desperdicio with its own Ubicación de Desperdicio and a required Motivo when that quantity is greater than zero — the Ubicación de Desperdicio SHALL be selectable independently of the producto's own Ubicación (e.g. good output goes to Cámara while the desperdicio goes to a discard/compost area). The system SHALL persist that as a Registro de Producto Fabricado before setting the order's estado to `FINALIZADA`. This applies uniformly whether the producto-line is a Producto Final or a Producto Intermedio (e.g. registering that a batch of masa was finalized and stored in a given ubicación for later use).

#### Scenario: Finalize a completed order
- **WHEN** a user marks an `EN_PRODUCCION` order as finished and, for each producto-line, enters a Cantidad Fabricada and selects an Ubicación
- **THEN** the system SHALL persist a Registro de Producto Fabricado per producto-line and set the order's estado to `FINALIZADA`

#### Scenario: Cantidad Fabricada differs from planned
- **WHEN** the entered Cantidad Fabricada for a producto-line is less than or greater than its planned Cantidad
- **THEN** the system SHALL accept the entered value without blocking, and SHALL record the actual value rather than the planned one

#### Scenario: Missing Ubicación
- **WHEN** a user attempts to finalize without selecting an Ubicación for a producto-line
- **THEN** the system SHALL block finalization and show a validation error on that line

#### Scenario: Registering desperdicio with its own ubicación and motivo
- **WHEN** a user enters a Cantidad de Desperdicio greater than zero for a producto-línea, selects an Ubicación de Desperdicio, and provides a Motivo (e.g. "quemado", "roto", "vencido")
- **THEN** the system SHALL include that Cantidad de Desperdicio, its Ubicación de Desperdicio, and Motivo in the línea's Registro de Producto Fabricado, independently of the Ubicación selected for the good Cantidad Fabricada

#### Scenario: Desperdicio without motivo or ubicación
- **WHEN** a user enters a Cantidad de Desperdicio greater than zero but leaves Motivo empty, or leaves its Ubicación de Desperdicio unselected
- **THEN** the system SHALL block finalization and show a validation error on that line

#### Scenario: No desperdicio on a línea
- **WHEN** a user leaves Cantidad de Desperdicio at zero (or empty) for a producto-línea
- **THEN** the system SHALL finalize that línea without requiring a Motivo or an Ubicación de Desperdicio

#### Scenario: Desperdicio ubicación differs from the producto's own ubicación
- **WHEN** a user selects a different ubicación for Cantidad de Desperdicio than the one selected for Cantidad Fabricada on the same línea
- **THEN** the system SHALL accept and persist both ubicaciones independently, without requiring them to match

### Requirement: View Registro de Producto Fabricado
The system SHALL display a read-only list of Registro de Producto Fabricado entries (`GET /costos/productos_fabricados`), showing Producto, Cantidad Fabricada, Ubicación, Cantidad de Desperdicio, Ubicación de Desperdicio (when there is desperdicio), Motivo (when there is desperdicio), Fecha, and the originating Orden de Producción (Código), filterable by Producto, Ubicación, and date range.

#### Scenario: View fabricado list
- **WHEN** a user opens "Producto Fabricado"
- **THEN** the system SHALL display all entries matching the applied filters, letting the user see, per producto, how much ended up in each ubicación and how much was desperdicio

#### Scenario: View desperdicio summary
- **WHEN** a user opens "Producto Fabricado"
- **THEN** the system SHALL let the user see total Cantidad de Desperdicio for the applied filters, so recurring waste by producto or by period can be spotted

### Requirement: Finalize or Cancel an Orden de Producción
The system SHALL allow cancelling an order in `ASIGNADA` (releasing its `RESERVA` movements without deducting stock); finalizing an order in `EN_PRODUCCION` follows the Register Producto Fabricado and Finalize requirement above.

#### Scenario: Cancel an unstarted order
- **WHEN** a user cancels an order still in `ASIGNADA`
- **THEN** the system SHALL set its estado to `CANCELADA` and release its `RESERVA` movements so the reserved insumos become available again
