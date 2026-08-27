## ADDED Requirements

### Requirement: View Stock Movements
The system SHALL display, per insumo, the history of stock movements (`GET /costos/insumos/{insumo_id}/movimientos`) showing Fecha, Tipo (`RESERVA`/`CONSUMO`/`AJUSTE`), Cantidad, and Referencia (e.g. the Orden de Producción that generated it, when applicable).

#### Scenario: View movement history from an insumo's detail
- **WHEN** a user opens an insumo's detail/edit page
- **THEN** the system SHALL display its movement history alongside the current Cantidad (stock)

### Requirement: Manually Adjust Insumo Stock
The system SHALL allow creating a manual stock adjustment for an insumo, entering a Cantidad (positive or negative) and a Motivo, which SHALL be recorded as an `AJUSTE` movement and reflected in the insumo's Cantidad.

#### Scenario: Successful manual adjustment
- **WHEN** a user opens "Ajustar Stock" on an insumo, enters a Cantidad and a Motivo, and confirms
- **THEN** the system SHALL POST to `/costos/insumos/{insumo_id}/movimientos` with tipo `AJUSTE`, show a success confirmation, and refresh the insumo's Cantidad

#### Scenario: Missing motivo
- **WHEN** a user submits an adjustment without a Motivo
- **THEN** the system SHALL block submission and show a validation error

### Requirement: View Stock Comprometido vs. Disponible
The system SHALL display, per insumo, the quantity currently reserved by open (`ASIGNADA`) Órdenes de Producción alongside the physical Cantidad, so users can see what is actually free to commit to a new order.

#### Scenario: View comprometido on the insumo list
- **WHEN** a user opens "Insumos"
- **THEN** the system SHALL display, in addition to Cantidad, a Comprometido column (sum of open `RESERVA` movements) and a computed Disponible (Cantidad − Comprometido)
