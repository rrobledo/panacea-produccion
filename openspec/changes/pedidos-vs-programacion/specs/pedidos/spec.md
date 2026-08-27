## ADDED Requirements

### Requirement: List Pedidos
The system SHALL display a list of customer orders (`GET /costos/pedidos`) with Cliente, Fecha de Pedido, Fecha de Entrega, and Estado columns, filterable by Fecha Desde, Fecha Hasta, and Estado.

#### Scenario: View filtered pedido list
- **WHEN** an authenticated user opens "Pedidos" with a Fecha Desde, Fecha Hasta, and Estado filter applied
- **THEN** the system SHALL request the list scoped to those filters and display the matching rows

### Requirement: Create Pedido
The system SHALL allow creating a new pedido with Cliente (via the clientes search picker), Fecha de Pedido, Fecha de Entrega, and one or more líneas (Producto via a search picker, Cantidad), and SHALL let the user stage líneas before the pedido exists, persisting them together with the pedido in the same request. New pedidos SHALL start in estado `pendiente`.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Pedido" form with Cliente, Fecha de Entrega, and at least one línea
- **THEN** the system SHALL POST the pedido and its líneas to `/costos/pedidos` in a single request, show a success confirmation, and return to the pedido list

#### Scenario: Missing required field
- **WHEN** a user submits the form without Cliente, Fecha de Entrega, or at least one línea
- **THEN** the system SHALL block submission and show a validation error on the missing field

### Requirement: Edit Pedido
The system SHALL allow editing an existing pedido's Fecha de Entrega, Estado (`pendiente`/`confirmado`/`cancelado`/`entregado`), and líneas, with `cliente` and `id` shown read-only.

#### Scenario: Successful update
- **WHEN** a user changes a field on an existing pedido and saves
- **THEN** the system SHALL PUT the updated record to `/costos/pedidos/{id}` and show a success confirmation

### Requirement: Delete Pedido
The system SHALL allow deleting a pedido from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a pedido row
- **THEN** the system SHALL DELETE `/costos/pedidos/{id}` and refresh the list

### Requirement: Warn When a Pedido Línea Exceeds Programación
The system SHALL check, when a user adds or edits a línea (Producto + Cantidad) on a Pedido, whether that quantity exceeds the disponibilidad computed for that producto in the week of the pedido's Fecha de Entrega (`GET /costos/disponibilidad_programacion`, scoped to that producto and week), and SHALL show a non-blocking warning if it does. This check does NOT prevent saving.

#### Scenario: Línea within available capacity
- **WHEN** a user enters a Producto and Cantidad on a pedido línea, and the resulting total committed quantity for that producto/week stays within what is programmed
- **THEN** the system SHALL show no warning

#### Scenario: Línea exceeds available capacity
- **WHEN** a user enters a Producto and Cantidad on a pedido línea, and the resulting total committed quantity for that producto/week exceeds what is programmed
- **THEN** the system SHALL display a warning indicating the producto and the shortfall, and SHALL still allow the user to save the pedido

#### Scenario: Disponibilidad check fails or is unavailable
- **WHEN** the disponibilidad check cannot be completed (e.g. the backend request fails)
- **THEN** the system SHALL allow the user to continue creating or saving the pedido without blocking on the check
