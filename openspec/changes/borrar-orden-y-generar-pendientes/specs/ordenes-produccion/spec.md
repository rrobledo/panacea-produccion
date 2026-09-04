## ADDED Requirements

### Requirement: Delete an Orden de Producción
The system SHALL allow deleting an Orden de Producción from its detail view, after an explicit confirmation that names the order. Deletion SHALL be permitted only for orders in estado `ASIGNADA` or `CANCELADA`; an order in `EN_PRODUCCION` has already consumed insumos and one in `FINALIZADA` has a Producto Fabricado record, so both SHALL be refused with an explanatory message. Deleting an order SHALL remove its producto-lines, its insumo-lines and its `RESERVA` stock movements, leaving no trace of it in the insumo's movement history.

#### Scenario: Delete an unstarted order
- **WHEN** a user confirms deletion of an order in estado `ASIGNADA`
- **THEN** the system SHALL delete the order with its producto-lines, insumo-lines and `RESERVA` movements, and SHALL return the user to the Órdenes de Producción list

#### Scenario: Delete a cancelled order
- **WHEN** a user confirms deletion of an order in estado `CANCELADA`
- **THEN** the system SHALL delete it the same way

#### Scenario: Deletion is refused once production started
- **WHEN** deletion is requested for an order in estado `EN_PRODUCCION` or `FINALIZADA`
- **THEN** the system SHALL refuse it and explain why, and SHALL NOT offer the action in the detail view for those estados

#### Scenario: Deletion is confirmed before it happens
- **WHEN** a user activates the delete action
- **THEN** the system SHALL ask for confirmation naming the order, and SHALL delete nothing until the user confirms

#### Scenario: Deleted order disappears from every view
- **WHEN** an order has been deleted
- **THEN** it SHALL no longer appear in the Órdenes de Producción list nor on the weekly board

#### Scenario: Deleting frees the insumos it had committed
- **WHEN** an order in `ASIGNADA` that committed insumos is deleted
- **THEN** the Comprometido of those insumos SHALL drop by the amounts that order held

## MODIFIED Requirements

### Requirement: Preview Órdenes de Producción Before Generating
The system SHALL let a user preview the Órdenes de Producción that would be created for a given fecha de fabricación without persisting anything, and SHALL create the orders only when the user explicitly confirms from that preview. The preview SHALL compute the same grouping and BOM explosion as generation, over the productos of that date that are **still pending** — those not already covered by an existing order for that date — and SHALL present the result as a list: one header row per order that would be created, carrying its selection control, its Producto Base, its Responsable/Área and its comparison against the Lote de Producción, followed by one row per producto-line (Producto, Cantidad Programada, Cantidad Planeada). The insumo-lines of an order (Insumo, Cantidad, Unidad de Medida) SHALL be reachable by expanding that order rather than shown for every order at once.

#### Scenario: Open the preview
- **WHEN** a user opens the generation preview for a fecha de fabricación
- **THEN** the system SHALL display, as a list, the orders that would be created, WITHOUT creating any Orden de Producción, stock movement, or reserva

#### Scenario: Every order is visible at once
- **WHEN** the preview holds several orders
- **THEN** the system SHALL list all of them with their comparison against the Lote de Producción visible without expanding any of them

#### Scenario: Confirm from the preview
- **WHEN** a user confirms generation from the preview
- **THEN** the system SHALL create the selected previewed orders, each in estado `ASIGNADA` with its reservas, and SHALL display the resulting orders

#### Scenario: Discard the preview
- **WHEN** a user closes or cancels the preview without confirming
- **THEN** the system SHALL leave the Programación, the Órdenes de Producción and the stock unchanged

#### Scenario: Nothing to generate
- **WHEN** the preview is requested for a date with no Programación rows
- **THEN** the system SHALL show an empty preview and SHALL NOT offer confirmation

#### Scenario: The date already has orders
- **WHEN** the preview is requested for a date that already has Órdenes de Producción
- **THEN** the system SHALL preview only the productos still pending for that date, and SHALL indicate that the date already has orders and how many

#### Scenario: Everything for that date is already generated
- **WHEN** every producto scheduled for that date is already covered by an existing order
- **THEN** the system SHALL state that there is nothing pending for that date and SHALL NOT offer confirmation

### Requirement: Generate Órdenes de Producción from Programación
The system SHALL let a user generate Órdenes de Producción for a given fecha de fabricación by grouping the productos scheduled in Programación for that date that are still pending by (`producto_base_id`, Responsable) — productos with no `producto_base_id` each form their own single-producto group — computing the total quantity needed per group, and exploding the corresponding BOM (the producto base's own Costos when the group shares one, or each producto's own Costos when it has no base) scaled to that quantity. A producto is pending when no order for that date in estado `ASIGNADA`, `EN_PRODUCCION` or `FINALIZADA` already includes it; an order in `CANCELADA` SHALL NOT cover its productos, so cancelling one returns them to pending. Each generated order inherits its Responsable/Área and receives a short Código from that group. Generation SHALL always go through a preview that the user confirms, and SHALL use the Cantidades Planeadas as confirmed in that preview, which may differ from the quantities held in Programación.

#### Scenario: Generate for a date with nothing generated yet
- **WHEN** a user confirms the preview for a date that has no orders
- **THEN** the system SHALL create one Orden de Producción per (producto_base/producto, Responsable) group found in that date's Programación, each in estado `ASIGNADA`, and SHALL display the resulting orders

#### Scenario: Multiple productos share a producto base
- **WHEN** two or more productos scheduled for the same date share the same `producto_base_id` (e.g. medialunas and facturas both based on the same masa)
- **THEN** the system SHALL create a single Orden de Producción listing every one of those productos as separate producto-lines, with one shared set of insumo-lines sized to their combined quantity

#### Scenario: No productos scheduled for that date
- **WHEN** a user requests generation for a date with no Programación rows
- **THEN** the system SHALL show an empty result rather than creating any order

#### Scenario: Generation uses the confirmed quantities
- **WHEN** the user confirmed the preview after editing one or more Cantidades Planeadas
- **THEN** the system SHALL size the producto-lines and explode the BOM using the confirmed quantities, not the ones stored in Programación

#### Scenario: A producto is added to an already-generated date
- **WHEN** a producto is scheduled for a date that already has orders, and generation is requested again for that date
- **THEN** the system SHALL create orders covering only the newly pending producto, and SHALL leave the existing orders untouched

#### Scenario: A cancelled order's productos can be generated again
- **WHEN** an order for a date is cancelled and generation is requested again for that date
- **THEN** the system SHALL treat that order's productos as pending and offer them for generation

#### Scenario: Nothing pending
- **WHEN** generation is requested for a date whose scheduled productos are all already covered
- **THEN** the system SHALL create no order and SHALL report that there is nothing pending

### Requirement: View Orden de Producción
The system SHALL assign every Orden de Producción a short, human-readable Código at generation time, unique across all orders. When a date is generated more than once, numbering SHALL continue from the highest Código already issued for that date rather than restarting, so a second generation never reuses a Código. The system SHALL display a list of Órdenes de Producción (`GET /costos/ordenes_produccion`), filterable by Fecha de Fabricación and Estado, and a detail view per order showing its Código, Responsable/Área, producto-lines (Producto, Cantidad Planeada) and insumo-lines (Insumo, Cantidad Asignada, Unidad de Medida). Cantidad Asignada SHALL be displayed as a whole number, without decimals.

#### Scenario: View order list
- **WHEN** a user opens "Órdenes de Producción"
- **THEN** the system SHALL display Código, Fecha de Fabricación, Producto Base/Producto, Responsable/Área, Estado, and cantidad de productos, filterable by date range and estado

#### Scenario: View order detail
- **WHEN** a user opens a specific order
- **THEN** the system SHALL display its Código, Responsable/Área, producto-lines, and insumo-lines read-only, with every Cantidad Asignada shown without decimals

#### Scenario: Order generated before whole-unit rounding
- **WHEN** a user opens an order created before insumo quantities were rounded at generation time
- **THEN** the system SHALL display its stored Cantidad Asignada rounded for display, without altering the stored value

#### Scenario: Second generation for the same date
- **WHEN** a date whose highest Código ends in `-02` is generated again
- **THEN** the new orders SHALL be numbered from `-03` onward, and no Código SHALL be repeated

#### Scenario: Códigos cannot collide
- **WHEN** the system attempts to store an Orden de Producción whose Código already exists
- **THEN** the store SHALL reject it rather than accept a duplicate
