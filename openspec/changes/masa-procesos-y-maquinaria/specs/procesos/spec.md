## ADDED Requirements

### Requirement: Artículo declara naturaleza y unidad base
The system SHALL classify every article by `naturaleza` (INSUMO, SEMIELABORADO, TERMINADO, RESIDUO) and SHALL record for each one a `unidad_base` of KG, UN, or LT. An article whose `unidad_base` is UN SHALL also record `peso_unitario_g`, the weight of one unit in grams, so that quantities can be converted between units and kilos. An article SHALL also carry a `vendible` flag independent of its naturaleza, so that an article can be both sold and consumed by another process.

#### Scenario: Producto vendido por kilo
- **WHEN** a user creates an article with `unidad_base = KG`
- **THEN** the system SHALL NOT require `peso_unitario_g` and SHALL express that article's stock, cost, and programmed quantities in kilos

#### Scenario: Producto contado por unidad
- **WHEN** a user creates an article with `unidad_base = UN`
- **THEN** the system SHALL require `peso_unitario_g` and SHALL block submission with a validation error if it is missing or zero

#### Scenario: Artículo vendible y componente a la vez
- **WHEN** a user marks an article with `naturaleza = TERMINADO` and `vendible = true` and that article appears as an ENTRADA line of another process
- **THEN** the system SHALL accept both facts without conflict and SHALL show the article in both the sales catalog and the component picker

### Requirement: Definir un proceso
The system SHALL allow defining a proceso with `tipo` (ELABORACION, DIVISION, TRANSFORMACION, FRACCIONAMIENTO), a `lote_referencia` with its `lote_unidad`, a `lote_minimo`, a `lote_multiplo`, `minutos_setup`, and a responsable. The `lote_referencia` SHALL be the quantity against which every line of that proceso is expressed.

#### Scenario: Crear un proceso de elaboración
- **WHEN** a user creates a proceso of tipo ELABORACION with `lote_referencia = 162`, `lote_unidad = KG`, and one or more ENTRADA lines
- **THEN** the system SHALL persist it and SHALL interpret every line quantity as "per 162 kg"

#### Scenario: Lote mínimo mayor que el de referencia
- **WHEN** a user saves a proceso whose `lote_minimo` exceeds its `lote_referencia`
- **THEN** the system SHALL block submission and show a validation error

### Requirement: Líneas de proceso con rol
The system SHALL allow each proceso to hold lines with a `rol` of ENTRADA, SALIDA, COPRODUCTO, or RESIDUO, each pointing at an article, with `cantidad`, `unidad`, and an `orden` of presentation. A line SHALL be able to point at any article regardless of its naturaleza, so that the output of one proceso can be the input of another.

#### Scenario: Una salida es entrada de otro proceso
- **WHEN** a user adds an ENTRADA line pointing at an article that is the SALIDA of another proceso
- **THEN** the system SHALL accept the line and SHALL treat the two procesos as chained when exploding demand

#### Scenario: Proceso sin salida
- **WHEN** a user saves a proceso with no line of rol SALIDA or COPRODUCTO
- **THEN** the system SHALL block submission and show a validation error

#### Scenario: Ciclo en el grafo
- **WHEN** a user adds a line that would make a proceso depend, directly or through other procesos, on its own output
- **THEN** the system SHALL reject the line and report which chain of procesos forms the cycle

### Requirement: Gramaje de las salidas contadas por unidad
The system SHALL record `gramaje_g` on every SALIDA or COPRODUCTO line whose article is counted in units, representing how much of the input article one unit consumes in its raw state. The system SHALL use `gramaje_g` — never the unit count alone — when converting a quantity of output into a quantity of input.

#### Scenario: Salida por unidad sin gramaje
- **WHEN** a user saves a SALIDA line whose article has `unidad_base = UN` and leaves `gramaje_g` empty
- **THEN** the system SHALL block submission and show a validation error naming that line

#### Scenario: Conversión de unidades a kilos de masa
- **WHEN** the system needs the input required by 100 units of an output whose `gramaje_g` is 360 and whose line declares a `merma_pct` of 2
- **THEN** the system SHALL compute `100 × 0,360 ÷ 0,98 = 36,73 kg` and SHALL NOT sum that output's unit count with any other output's

### Requirement: Merma y rendimiento declarados en la fórmula
The system SHALL record on each proceso line a `merma_pct` (the fraction expected to be lost while dividing or cutting) and a `rendimiento_pct` (the fraction that survives baking). The system SHALL use both to size how much to produce, and SHALL compare the `cantidad_desperdicio` registered when an orden is finalized against the declared `merma_pct`.

#### Scenario: Dimensionar la producción con la merma esperada
- **WHEN** a demand requires 100 kg of good output from a line whose `merma_pct` is 2
- **THEN** the system SHALL require 102,04 kg of input, not 100

#### Scenario: Desvío entre merma esperada y real
- **WHEN** an orden is finalized with a `cantidad_desperdicio` that implies a loss above the line's declared `merma_pct`
- **THEN** the system SHALL record the deviation and SHALL make it available as a reported difference per producto and fecha

### Requirement: Explosión inversa de demanda a semielaborado
The system SHALL translate a demand expressed in finished products into a requirement expressed in the unit of the semielaborado, by multiplying each product's quantity by its line's `gramaje_g`, dividing by its `merma_pct`, and summing the results across all branches that feed the same semielaborado. The system SHALL NOT sum quantities of different finished products directly.

#### Scenario: Dos productos de distinto gramaje de la misma masa
- **WHEN** 100 units of a 360 g product and 100 units of a 110 g product are demanded from the same masa
- **THEN** the system SHALL compute the masa requirement as the sum of each branch in kilos, and SHALL NOT compute it as `200 ÷ lote_produccion`

#### Scenario: Demanda expresada en kilos
- **WHEN** the demanded product has `unidad_base = KG`
- **THEN** the system SHALL convert kilos of sellable product to units using `gramaje_g` and `rendimiento_pct` before applying the branch's merma

### Requirement: Redondeo a lote y destino del sobrante
The system SHALL round the computed requirement of a semielaborado up to the proceso's `lote_multiplo`, never below its `lote_minimo`. The difference between the rounded lote and the requirement SHALL be recorded as produced stock of that semielaborado, available to be consumed by a later orden before amasar again.

#### Scenario: Requerimiento por debajo del lote mínimo
- **WHEN** the computed requirement is 47 kg and the proceso declares a `lote_minimo` of 162 kg
- **THEN** the system SHALL plan one lote of 162 kg and SHALL record the 115 kg difference as stock of that semielaborado

#### Scenario: Stock existente cubre parte del requerimiento
- **WHEN** a semielaborado has stock available and a new orden requires that semielaborado
- **THEN** the system SHALL subtract the available stock from the requirement before rounding to lote, and SHALL show the user how much came from stock and how much from a new lote

### Requirement: Versionado de recetas
The system SHALL version each proceso with a `vigente_desde` date, SHALL keep prior versions readable, and SHALL record on every orden de producción which proceso version it was emitted against. Editing a proceso SHALL create a new version rather than overwrite the one already referenced by an emitted orden.

#### Scenario: Editar una receta ya usada
- **WHEN** a user edits a proceso that at least one emitted orden references
- **THEN** the system SHALL create a new version with a new `vigente_desde` and SHALL leave the referenced version unchanged

#### Scenario: Recosteo histórico
- **WHEN** a cost report is produced for a past date
- **THEN** the system SHALL use the proceso version that the ordenes of that date were emitted against, not the current one

### Requirement: Fraccionamiento con coproductos y residuo
The system SHALL support a proceso of tipo FRACCIONAMIENTO that takes one article and produces several COPRODUCTO lines plus optional RESIDUO lines. The cost of the input SHALL be allocated among the coproductos in proportion to their weight, and the weight of any RESIDUO without commercial value SHALL be absorbed by the coproductos rather than assigned to the residuo.

#### Scenario: Reparto por peso con residuo sin valor
- **WHEN** a 6,00 kg input costing $18.000 is cut into 4,32 kg of one coproducto, 1,20 kg of another, and 0,48 kg of residuo without value
- **THEN** the system SHALL assign $14.087 to the first and $3.913 to the second, in proportion to the 5,52 kg of good output, and $0 to the residuo

#### Scenario: Coproducto que alimenta otro proceso
- **WHEN** a coproducto is used as the ENTRADA of another proceso
- **THEN** the system SHALL carry its allocated cost into that proceso as the cost of that input

### Requirement: Validación de la suma de las ramas
The system SHALL warn when the sum of the input consumed by all branches of a proceso does not match its `lote_referencia`, showing the difference, and SHALL allow the user to save anyway.

#### Scenario: Las ramas no suman el lote
- **WHEN** a user saves a proceso whose branch quantities sum to 150 kg against a `lote_referencia` of 162 kg
- **THEN** the system SHALL show the 12 kg difference as a warning and SHALL still persist the proceso
