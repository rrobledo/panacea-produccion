## ADDED Requirements

### Requirement: Whole-Unit Reserva on Order Generation
The `RESERVA` movement created when an Orden de Producción is generated SHALL record the same whole-number quantity that the order's insumo-line holds, so that what is shown on the order is exactly what is reserved and later consumed. An insumo whose exact requirement is greater than zero SHALL be reserved as at least 1 in its Unidad de Medida, never as zero.

#### Scenario: Reserva matches the insumo-line
- **WHEN** an Orden de Producción is generated with an insumo-line of `1349`
- **THEN** the system SHALL record a `RESERVA` movement of `1349` for that insumo, with no fractional remainder

#### Scenario: Small requirement is still reserved
- **WHEN** an order's exact requirement for an insumo is greater than zero but rounds to zero (e.g. `0.4 KG`)
- **THEN** the system SHALL record a `RESERVA` movement of `1` for that insumo rather than none

#### Scenario: Comprometido reflects whole units
- **WHEN** a user views Comprometido for an insumo reserved by open orders generated under this rule
- **THEN** the system SHALL display a whole-number Comprometido and a Disponible computed from it

#### Scenario: Consumo matches the reserva
- **WHEN** an order whose insumo-lines were rounded at generation moves to `EN_PRODUCCION`
- **THEN** the system SHALL record `CONSUMO` movements for exactly the same whole-number quantities that were reserved
