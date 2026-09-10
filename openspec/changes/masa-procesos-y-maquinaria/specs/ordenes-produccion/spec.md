## ADDED Requirements

### Requirement: La orden se emite contra un proceso y una versión de receta
The system SHALL record on every orden de producción the `proceso_id` and the proceso version it was emitted against, and SHALL group ordenes by `(proceso, responsable)` in place of the former `(producto_base_id, responsable)`.

#### Scenario: Emitir una orden
- **WHEN** the system generates ordenes for a fecha
- **THEN** each orden SHALL carry the proceso and version that produced its insumo explosion, and SHALL keep them unchanged if the proceso is later edited

#### Scenario: Reimprimir una orden con receta cambiada
- **WHEN** a user reprints an orden whose proceso has been edited since it was emitted
- **THEN** the system SHALL print the version the orden was emitted against, not the current one

### Requirement: Las líneas de producto guardan gramaje, masa y bollos
The system SHALL store on each producto line of an orden its `programacion_id`, the `masa_kg` that branch consumes, the `gramaje_g` applied, and the resulting `bollos` count, in addition to the `cantidad_planeada` already stored.

#### Scenario: Línea con su rama de masa
- **WHEN** an orden is generated from a demand of 100 units of a 360 g product
- **THEN** the line SHALL record 36,73 kg of masa, a gramaje of 360 g, and 102 bollos, alongside the 100 units planned

#### Scenario: Reconciliar contra la Programación
- **WHEN** an orden line is finalized
- **THEN** the system SHALL use the stored `programacion_id` to write the executed quantity to the exact Programación row that originated it

### Requirement: La orden se imprime en tres bloques
The system SHALL print the orden de trabajo as three blocks: the fórmula of the masa with its insumos and their baker's percentages, the partición listing what to take out of that masa with masa, gramaje, bollos, and programmed quantity per producto, and the recorrido of máquinas.

#### Scenario: Imprimir una orden de masa compartida
- **WHEN** a user prints an orden whose proceso divides one masa into three productos
- **THEN** the printed document SHALL show the fórmula once and the three branches in the partición block, each with its gramaje and bollo count

#### Scenario: Orden de un proceso degenerado
- **WHEN** a user prints an orden whose proceso has a single output at 100 %
- **THEN** the printed document SHALL still show the three blocks, with a single row in the partición block

### Requirement: El preview muestra kilos de masa además de unidades
The system SHALL show, in the generation preview, the masa requirement in kilos alongside the editable quantity per producto, and SHALL recompute both the masa requirement and the insumo explosion when a quantity is edited.

#### Scenario: Editar una cantidad en el preview
- **WHEN** a user changes the quantity of one producto in the preview
- **THEN** the system SHALL update that branch's masa in kilos, the group's total masa, the rounded lote, and the insumo list

#### Scenario: Requerimiento por debajo del lote mínimo
- **WHEN** the edited quantities produce a masa requirement below the proceso's `lote_minimo`
- **THEN** the system SHALL show the lote that will actually be produced and the resulting sobrante, rather than only marking the shortfall

### Requirement: La orden declara las máquinas que necesita
The system SHALL resolve, when an orden is generated, a concrete máquina for each operación of its proceso, and SHALL store the resolved máquina, the bachas, and the estimated occupancy on the orden.

#### Scenario: Resolver la máquina al emitir
- **WHEN** an orden is generated for a proceso whose amasado operación requires an AMASADORA of at least 60 kg
- **THEN** the system SHALL assign an ACTIVA máquina meeting that requirement and SHALL store it on the orden's operación

#### Scenario: Máquina en mantenimiento
- **WHEN** the only máquina meeting an operación's requirement is in MANTENIMIENTO
- **THEN** the system SHALL emit the orden with that operación flagged as unresolved, and SHALL NOT require any receta to be edited
