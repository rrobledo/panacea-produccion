## ADDED Requirements

### Requirement: Preview Órdenes de Producción Before Generating
The system SHALL let a user preview the Órdenes de Producción that would be created for a given fecha de fabricación without persisting anything, and SHALL create the orders only when the user explicitly confirms from that preview. The preview SHALL compute the same grouping and BOM explosion as generation, and SHALL show, per order that would be created, its Responsable/Área, its producto-lines (Producto, Cantidad Planeada) and its resulting insumo-lines (Insumo, Cantidad, Unidad de Medida).

#### Scenario: Open the preview
- **WHEN** a user opens "Órdenes de Producción" and clicks "Generar Órdenes de Mañana"
- **THEN** the system SHALL request the preview for the next calendar date and display the orders that would be created, WITHOUT creating any Orden de Producción, stock movement, or reserva

#### Scenario: Confirm from the preview
- **WHEN** a user confirms generation from the preview
- **THEN** the system SHALL create the previewed orders, each in estado `ASIGNADA` with its reservas, and SHALL display the resulting orders

#### Scenario: Discard the preview
- **WHEN** a user closes or cancels the preview without confirming
- **THEN** the system SHALL leave the Programación, the Órdenes de Producción and the stock unchanged

#### Scenario: Nothing to generate
- **WHEN** the preview is requested for a date with no Programación rows
- **THEN** the system SHALL show an empty preview and SHALL NOT offer confirmation

#### Scenario: Orders already exist for that date
- **WHEN** the preview is requested for a date that already has Órdenes de Producción
- **THEN** the system SHALL report that orders already exist for that date instead of showing a preview

### Requirement: Compare Planned Quantity Against Lote de Producción
The preview SHALL show, per order that would be created, the Lote de Producción of the formula (that of the producto base when the group shares one, or that of the single producto otherwise), the total Cantidad Planeada of the group, and the difference between the two. When the group total is strictly less than the Lote de Producción, the system SHALL flag that order in red, because the recipe is being scaled below its intended batch. The comparison SHALL be made at the order (producto base group) level, which is the level at which the BOM is scaled.

#### Scenario: Planned total below the lote óptimo
- **WHEN** an order's total Cantidad Planeada is less than the Lote de Producción of its formula
- **THEN** the system SHALL display that order's comparison in red, showing the Lote de Producción, the planned total, and the shortfall

#### Scenario: Planned total at or above the lote óptimo
- **WHEN** an order's total Cantidad Planeada equals or exceeds the Lote de Producción of its formula
- **THEN** the system SHALL display the comparison without the red flag, showing the difference

#### Scenario: Group of productos sharing a producto base
- **WHEN** several productos in the preview share the same producto base
- **THEN** the system SHALL compare the sum of their Cantidades Planeadas against the producto base's Lote de Producción, as one single comparison for the order

### Requirement: Edit Cantidad Planeada in the Preview
The system SHALL allow editing the Cantidad Planeada of each producto-line in the preview before confirming, accepting whole numbers only. On each edit the system SHALL recompute, for the affected order, the group total, the comparison against the Lote de Producción (including the red flag) and the resulting insumo-lines. The edited quantity SHALL be used only to create the Orden de Producción and SHALL NOT modify `Programacion.plan`; any line whose quantity differs from what the Programación holds SHALL be visually marked as diverging from the plan.

#### Scenario: Edit a quantity
- **WHEN** a user changes the Cantidad Planeada of a producto-line in the preview
- **THEN** the system SHALL recompute that order's group total, its difference against the Lote de Producción, its red flag, and its insumo-lines

#### Scenario: Edited line is marked as diverging
- **WHEN** a producto-line's Cantidad Planeada differs from the quantity programmed for it
- **THEN** the system SHALL mark that line as diverging from the Programación

#### Scenario: Programación is left untouched
- **WHEN** a user confirms generation after editing quantities in the preview
- **THEN** the system SHALL create the orders with the edited quantities and SHALL leave the corresponding `Programacion.plan` values unchanged

#### Scenario: Invalid quantity
- **WHEN** a user enters a non-integer or negative Cantidad Planeada
- **THEN** the system SHALL block confirmation and show a validation error

#### Scenario: Quantity reduced to zero
- **WHEN** a user sets a producto-line's Cantidad Planeada to zero
- **THEN** the system SHALL exclude that producto-line from the order to be created, and SHALL NOT create the order at all if it would leave the order with no producto-lines

### Requirement: Whole-Unit Insumo Quantities
The system SHALL record and display Cantidad on insumo-lines of an Orden de Producción as a whole number, rounded to zero decimals at generation time, since production does not handle fractional quantities. Rounding SHALL be applied once to each insumo's total requirement for the order, not to each contribution to that total. An insumo whose exact requirement is greater than zero SHALL never be rounded down to zero: it SHALL be recorded as at least 1 in its Unidad de Medida, so that a required insumo is never silently dropped from the order.

#### Scenario: Requirement with decimals
- **WHEN** an order's computed requirement for an insumo is `1348.6666666666667`
- **THEN** the system SHALL record and display `1349` for that insumo-line

#### Scenario: Small non-zero requirement
- **WHEN** an order's computed requirement for an insumo is greater than zero but rounds to zero (e.g. `0.4 KG`)
- **THEN** the system SHALL record and display `1` for that insumo-line rather than omitting it

#### Scenario: Insumo not required
- **WHEN** an order's computed requirement for an insumo is exactly zero
- **THEN** the system SHALL omit that insumo-line from the order

#### Scenario: Preview matches what is generated
- **WHEN** a user compares the insumo quantities shown in the preview with those of the order created from it
- **THEN** they SHALL be identical whole numbers

## MODIFIED Requirements

### Requirement: Generate Órdenes de Producción from Programación
The system SHALL let a user generate Órdenes de Producción for a given fecha de fabricación, one day ahead of that date, by grouping the productos scheduled in Programación for that date by (`producto_base_id`, Responsable) — productos with no `producto_base_id` each form their own single-producto group — computing the total quantity needed per group, and exploding the corresponding BOM (the producto base's own Costos when the group shares one, or each producto's own Costos when it has no base) scaled to that quantity. Each generated order inherits its Responsable/Área and receives a short Código from that group. Generation SHALL always go through a preview that the user confirms, and SHALL use the Cantidades Planeadas as confirmed in that preview, which may differ from the quantities held in Programación.

#### Scenario: Generate orders for tomorrow
- **WHEN** a user opens "Órdenes de Producción", clicks "Generar Órdenes de Mañana", and confirms the preview shown for the next calendar date
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

### Requirement: View Orden de Producción
The system SHALL assign every Orden de Producción a short, human-readable Código (e.g. `OP-20260822-01`) at generation time, and SHALL display a list of Órdenes de Producción (`GET /costos/ordenes_produccion`), filterable by Fecha de Fabricación and Estado, and a detail view per order showing its Código, Responsable/Área, producto-lines (Producto, Cantidad Planeada) and insumo-lines (Insumo, Cantidad Asignada, Unidad de Medida). Cantidad Asignada SHALL be displayed as a whole number, without decimals.

#### Scenario: View order list
- **WHEN** a user opens "Órdenes de Producción"
- **THEN** the system SHALL display Código, Fecha de Fabricación, Producto Base/Producto, Responsable/Área, Estado, and cantidad de productos, filterable by date range and estado

#### Scenario: View order detail
- **WHEN** a user opens a specific order
- **THEN** the system SHALL display its Código, Responsable/Área, producto-lines, and insumo-lines read-only, with every Cantidad Asignada shown without decimals

#### Scenario: Order generated before whole-unit rounding
- **WHEN** a user opens an order created before insumo quantities were rounded at generation time
- **THEN** the system SHALL display its stored Cantidad Asignada rounded for display, without altering the stored value
