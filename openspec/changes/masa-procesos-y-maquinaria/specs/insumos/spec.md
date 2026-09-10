## ADDED Requirements

### Requirement: Las cantidades de insumo se redondean según su unidad de medida
The system SHALL round a computed insumo quantity according to that insumo's `unidad_medida`: quantities in UN SHALL be rounded to whole units, and quantities in KG, LT, GR, and ML SHALL keep three decimal places. The system SHALL NOT apply a floor of 1 to any quantity.

#### Scenario: Insumo contado por unidad
- **WHEN** a computed requirement of an insumo whose `unidad_medida` is UN is 12,4
- **THEN** the system SHALL reserve 12 units

#### Scenario: Insumo pesado en kilos
- **WHEN** a computed requirement of an insumo whose `unidad_medida` is KG is 0,4
- **THEN** the system SHALL reserve 0,400 kg and SHALL NOT round it up to 1

#### Scenario: Requerimiento exactamente cero
- **WHEN** a computed requirement of any insumo is zero
- **THEN** the system SHALL omit that insumo from the orden rather than reserve a minimum quantity

### Requirement: El precio del insumo declara su unidad
The system SHALL display, wherever `insumos.precio` is shown or entered, the `unidad_medida` it refers to, so that a price per kilo is never read as a price per unit.

#### Scenario: Ver el precio con su unidad
- **WHEN** a user opens an insumo's edit form or sees its price in a cost breakdown
- **THEN** the system SHALL render the price as an amount per that insumo's `unidad_medida`
