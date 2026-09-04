## ADDED Requirements

### Requirement: Select Which Órdenes to Generate
The preview SHALL let a user choose which of the previewed orders to generate, with every order selected by default, and SHALL offer a single control to select or deselect all of them at once. Confirming SHALL create only the selected orders and SHALL leave the deselected ones with no trace: no Orden de Producción, no stock movement, no change to Programación. The confirmation control SHALL state how many orders will be created and SHALL be unavailable when nothing is selected.

#### Scenario: Everything is selected by default
- **WHEN** a user opens the preview
- **THEN** the system SHALL show every order selected, and the confirmation control SHALL report the full count

#### Scenario: Deselect one order
- **WHEN** a user deselects one order and confirms
- **THEN** the system SHALL create every other previewed order and SHALL NOT create that one, nor any reserva for it

#### Scenario: Select or deselect all at once
- **WHEN** a user activates the select-all control
- **THEN** the system SHALL select every order if any was deselected, and deselect every order if all were selected

#### Scenario: Nothing selected
- **WHEN** no order is selected
- **THEN** the system SHALL disable confirmation and SHALL indicate that at least one order must be selected

#### Scenario: Deselected order keeps its edits
- **WHEN** a user edits a quantity on an order, deselects that order, and selects it again
- **THEN** the system SHALL preserve the edited quantity

### Requirement: Expand an Orden in the Preview to See Its Insumos
Each order in the preview SHALL be expandable in place to reveal the insumo-lines computed for it (Insumo, Cantidad, Unidad de Medida), and collapsible again. Orders SHALL start collapsed, more than one MAY be expanded at the same time, and expanding SHALL NOT navigate away from the list nor alter the selection. An expanded order's insumo-lines SHALL reflect the quantities currently entered in the list.

#### Scenario: Expand an order
- **WHEN** a user expands an order in the preview
- **THEN** the system SHALL reveal that order's insumo-lines inline, leaving the rest of the list visible

#### Scenario: Several orders expanded at once
- **WHEN** a user expands a second order without collapsing the first
- **THEN** the system SHALL keep both expanded

#### Scenario: Expanded insumos follow an edit
- **WHEN** a user edits a Cantidad Planeada while that order is expanded
- **THEN** the system SHALL refresh the visible insumo-lines to match the new quantity

#### Scenario: Expanding does not change selection
- **WHEN** a user expands or collapses an order
- **THEN** the system SHALL leave that order's selection unchanged

### Requirement: Print a Complete Orden de Producción
The system SHALL allow printing a full Orden de Producción from its detail view, as a document separate from the oblea. The printout SHALL contain the order's Código, Fecha de Fabricación, Responsable/Área and Estado; the dates of its lifecycle (creación, en producción, finalización or cancelación, whichever apply); its producto-lines with Cantidad Planeada; and its insumo-lines with Cantidad and Unidad de Medida. For a finalized order it SHALL also contain, per producto, the Cantidad Fabricada and its Ubicación, plus the Cantidad de Desperdicio with its Ubicación and Motivo when there was any. Printing SHALL use the browser print dialog scoped to that content, and the on-screen controls SHALL NOT appear on the printed page.

#### Scenario: Print an order that has not been finalized
- **WHEN** a user prints an order in estado `ASIGNADA` or `EN_PRODUCCION`
- **THEN** the system SHALL produce a page with its código, fecha de fabricación, responsable, estado, the lifecycle dates recorded so far, its producto-lines and its insumo-lines, and SHALL omit the fabricado section

#### Scenario: Print a finalized order
- **WHEN** a user prints an order in estado `FINALIZADA`
- **THEN** the system SHALL additionally include, per producto, the Cantidad Fabricada and its Ubicación, and the Cantidad de Desperdicio with its Ubicación and Motivo where desperdicio was recorded

#### Scenario: Insumo quantities on the printout
- **WHEN** an order is printed
- **THEN** every insumo Cantidad SHALL appear as a whole number, consistent with the detail view

#### Scenario: Controls are excluded from the printout
- **WHEN** an order is printed
- **THEN** the printed page SHALL contain neither the print buttons nor the page's navigation

#### Scenario: The oblea remains available
- **WHEN** a user opens an order's detail
- **THEN** the system SHALL offer printing the full order and printing the oblea as two separate actions, the oblea keeping its own compact format with no insumo detail

## MODIFIED Requirements

### Requirement: Preview Órdenes de Producción Before Generating
The system SHALL let a user preview the Órdenes de Producción that would be created for a given fecha de fabricación without persisting anything, and SHALL create the orders only when the user explicitly confirms from that preview. The preview SHALL compute the same grouping and BOM explosion as generation, and SHALL present the result as a list: one header row per order that would be created, carrying its selection control, its Producto Base, its Responsable/Área and its comparison against the Lote de Producción, followed by one row per producto-line (Producto, Cantidad Programada, Cantidad Planeada). The insumo-lines of an order (Insumo, Cantidad, Unidad de Medida) SHALL be reachable by expanding that order rather than shown for every order at once.

#### Scenario: Open the preview
- **WHEN** a user opens "Órdenes de Producción" and clicks "Generar Órdenes de Mañana"
- **THEN** the system SHALL request the preview for the next calendar date and display, as a list, the orders that would be created, WITHOUT creating any Orden de Producción, stock movement, or reserva

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

#### Scenario: Orders already exist for that date
- **WHEN** the preview is requested for a date that already has Órdenes de Producción
- **THEN** the system SHALL report that orders already exist for that date instead of showing a preview

### Requirement: Edit Cantidad Planeada in the Preview
The system SHALL allow editing the Cantidad Planeada of each producto-line directly in the preview list, without expanding the order or opening any other view, accepting whole numbers only. On each edit the system SHALL recompute, for the affected order, the group total, the comparison against the Lote de Producción (including the red flag) and the resulting insumo-lines. The edited quantity SHALL be used only to create the Orden de Producción and SHALL NOT modify `Programacion.plan`; any line whose quantity differs from what the Programación holds SHALL be visually marked as diverging from the plan, with the programmed quantity kept visible alongside it.

#### Scenario: Edit a quantity from the list
- **WHEN** a user changes the Cantidad Planeada of a producto-line in the list
- **THEN** the system SHALL recompute that order's group total, its difference against the Lote de Producción, its red flag, and its insumo-lines, without collapsing or expanding anything

#### Scenario: Edited line is marked as diverging
- **WHEN** a producto-line's Cantidad Planeada differs from the quantity programmed for it
- **THEN** the system SHALL mark that line as diverging from the Programación and SHALL keep the programmed quantity visible on the same row

#### Scenario: Programación is left untouched
- **WHEN** a user confirms generation after editing quantities in the preview
- **THEN** the system SHALL create the orders with the edited quantities and SHALL leave the corresponding `Programacion.plan` values unchanged

#### Scenario: Invalid quantity
- **WHEN** a user enters a non-integer or negative Cantidad Planeada
- **THEN** the system SHALL block confirmation and show a validation error

#### Scenario: Invalid quantity on a deselected order
- **WHEN** a producto-line holds an invalid quantity but its order is not selected
- **THEN** the system SHALL NOT block confirmation on account of that line, since the order will not be created

#### Scenario: Quantity reduced to zero
- **WHEN** a user sets a producto-line's Cantidad Planeada to zero
- **THEN** the system SHALL exclude that producto-line from the order to be created, and SHALL NOT create the order at all if it would leave the order with no producto-lines
