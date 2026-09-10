## MODIFIED Requirements

### Requirement: Costo Materia Prima Report
The system SHALL display a read-only list of raw-material cost analysis per product, with a detail drill-down per product. The unit cost SHALL be built in two layers: the cost per unit of the semielaborado it consumes, plus the time and machine cost of its own branch. It SHALL NOT be computed by flattening the whole chain to insumos.

#### Scenario: View cost list
- **WHEN** a user opens "Costo Materia Prima"
- **THEN** the system SHALL display Producto, Proceso, Lote del Proceso, Precio Venta, Costo MP, Costo MO, Margen Utilidad, and monthly estimated Ventas/Costo/Utilidad columns, sourced from `/costos/costos_materia_prima`

#### Scenario: View product cost detail
- **WHEN** a user opens a specific producto's cost detail
- **THEN** the system SHALL display the cost of the semielaborado consumed, the branch's own labour and machine cost, and the insumo-level breakdown of the semielaborado (Insumo, Cantidad, Costo, Porcentaje del Total), from `/costos/costos_materia_prima/{producto_id}`

#### Scenario: Dos ramas de la misma masa
- **WHEN** two productos come from the same masa but declare different `minutos_directos`
- **THEN** the system SHALL show the same cost per kilo of masa for both and different unit costs, reflecting each branch's own time

## ADDED Requirements

### Requirement: Costo por capas del semielaborado
The system SHALL compute and expose the cost per unit of every semielaborado as `(Σ(cantidad_insumo × precio_insumo) + minutos de amasado × tarifa) ÷ cantidad buena del lote`, and SHALL use it as the input cost of every branch that consumes it.

#### Scenario: Consultar el costo de una masa
- **WHEN** a user opens a semielaborado's cost view
- **THEN** the system SHALL display its cost per unit of `unidad_base` and the insumo and labour lines that make it up

#### Scenario: Cambio de precio de un insumo
- **WHEN** the price of an insumo used by a masa changes
- **THEN** the system SHALL recompute the masa's cost per unit and, through it, the cost of every producto that consumes it, without any producto being edited

### Requirement: Costo de mano de obra por centro de trabajo y máquina
The system SHALL derive the labour cost of a branch from its `minutos_directos` and the hourly rate of its centro de trabajo, and the machine cost from its `minutos_maquina` and the hourly rate of the resolved máquina. Minutes of an operación declared `requiere_operario = false` SHALL contribute machine cost but no labour cost.

#### Scenario: Rama con formado manual
- **WHEN** a branch declares 90 minutes of `minutos_directos` at a centro whose rate is $4.500 per hour
- **THEN** the system SHALL add $6.750 of labour cost to that branch

#### Scenario: Fermentación sin operario
- **WHEN** an operación occupies the cámara for 90 minutes with `requiere_operario = false`
- **THEN** the system SHALL add the cámara's machine cost and no labour cost

### Requirement: Reparto del costo conjunto de un fraccionamiento
The system SHALL allocate the cost of a fraccionamiento's input among its coproductos in proportion to their weight, absorbing the weight of any RESIDUO without commercial value into the good outputs.

#### Scenario: Ver el reparto de una plancha
- **WHEN** a user opens the cost detail of a coproducto of a fraccionamiento
- **THEN** the system SHALL show the input's total cost, each coproducto's weight share of the good output, and the amount allocated to it

## REMOVED Requirements

### Requirement: Precio Productos Report
**Reason**: The endpoint `/costos/precio_productos` returns two generations of the same figures side by side — `costo_unitario_fab` next to `costo_unitario_fab_new`, `costo_total` next to `costo_total_new` — and neither the report nor the code says which one is current. With cost now built in two layers, keeping both would leave three answers to the same question.

**Migration**: The report is rebuilt on the layered cost, keeping one field per figure: `costo_unitario_mp`, `costo_unitario_mo`, `costo_unitario_maquina`, `costo_total`, `precio_sugerido`, and the ganancia columns per caja. The `*_new` variants are dropped once the rebuilt report matches the old `*_new` values for a full month of closed data.
