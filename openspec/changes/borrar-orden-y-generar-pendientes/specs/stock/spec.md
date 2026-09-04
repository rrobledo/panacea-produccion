## ADDED Requirements

### Requirement: Deleting an Orden Removes Its Reservas
When an Orden de Producción is deleted, the `RESERVA` movements it created SHALL be deleted with it, so that no insumo's movement history shows a reserva referencing an order that no longer exists. Only orders that never reached production can be deleted, so no `CONSUMO` movement is ever affected. The Comprometido of the involved insumos SHALL reflect the deletion, since it is computed from the insumo-lines of live `ASIGNADA` orders and those lines go away with the order.

#### Scenario: Reservas go away with the order
- **WHEN** an order in `ASIGNADA` holding reservas is deleted
- **THEN** the system SHALL delete those `RESERVA` movements, and the insumo's movement history SHALL no longer list them

#### Scenario: Comprometido drops
- **WHEN** an order in `ASIGNADA` that committed an insumo is deleted
- **THEN** that insumo's Comprometido SHALL drop by the deleted amount and its Disponible SHALL rise accordingly

#### Scenario: Physical stock is untouched
- **WHEN** an order is deleted
- **THEN** the insumo's Cantidad SHALL NOT change, because a `RESERVA` never moved physical stock

#### Scenario: A cancelled order's reservas
- **WHEN** an order in `CANCELADA` is deleted
- **THEN** the system SHALL delete its `RESERVA` movements as well, leaving no orphan history
