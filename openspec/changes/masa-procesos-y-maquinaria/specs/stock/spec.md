## ADDED Requirements

### Requirement: El ledger cubre artículos producidos, no sólo insumos
The system SHALL record stock movements for articles of naturaleza SEMIELABORADO and TERMINADO in the same ledger that already covers insumos, adding the movement types PRODUCCION (an orden produced the article) and CONSUMO_INTERNO (a later proceso consumed it). Every movement SHALL reference its orden by foreign key.

#### Scenario: Producir un semielaborado
- **WHEN** an orden that produces a semielaborado is finalized
- **THEN** the system SHALL record a PRODUCCION movement for the quantity produced and SHALL increase that article's available stock

#### Scenario: Consumir un semielaborado en otro proceso
- **WHEN** an orden consumes a semielaborado that has stock
- **THEN** the system SHALL record a CONSUMO_INTERNO movement and SHALL decrease that article's available stock

#### Scenario: Movimiento referenciado por clave foránea
- **WHEN** a stock movement is created by an orden
- **THEN** the system SHALL store the orden's id as a foreign key, so deleting the orden cannot leave orphan movements

### Requirement: Stock de masa sobrante
The system SHALL treat the difference between a rounded lote and the requirement that caused it as produced stock of that semielaborado, available to a later orden.

#### Scenario: Sobrante de un redondeo a lote
- **WHEN** an orden rounds a requirement of 47 kg up to a lote of 162 kg and is finalized
- **THEN** the system SHALL record 162 kg of PRODUCCION and the consumption of 47 kg, leaving 115 kg of available stock

#### Scenario: Consumir el sobrante antes de amasar
- **WHEN** a new orden requires a semielaborado that has available stock
- **THEN** the system SHALL subtract the available stock from the requirement before rounding to lote, and SHALL show how much came from stock and how much from a new lote

### Requirement: Ver el stock de semielaborados
The system SHALL show, per semielaborado, its available quantity in its `unidad_base`, its committed quantity, and the movements that produced them.

#### Scenario: Consultar el saldo de una masa
- **WHEN** a user opens a semielaborado's stock view
- **THEN** the system SHALL display available, committed, and the movement history with fecha, tipo, cantidad, and the referenced orden
