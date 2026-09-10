## ADDED Requirements

### Requirement: Catálogo de máquinas
The system SHALL provide CRUD over a catalog of máquinas, each with `codigo`, `nombre`, `tipo` (AMASADORA, SOBADORA, DIVISORA, LAMINADORA, BATIDORA, CAMARA, HORNO, MESA), `capacidad`, `capacidad_unidad` (KG, CARROS, BANDEJAS, LITROS, KG_HORA), `minutos_setup`, `minutos_limpieza`, `area`, `estado` (ACTIVA, MANTENIMIENTO, BAJA), and an availability window `turno_desde` / `turno_hasta`.

#### Scenario: Alta de una máquina
- **WHEN** a user submits the "Nueva Máquina" form with tipo, capacidad, and capacidad_unidad
- **THEN** the system SHALL persist the máquina and show it in the catalog list

#### Scenario: Capacidad sin unidad
- **WHEN** a user submits a máquina with a `capacidad` but no `capacidad_unidad`
- **THEN** the system SHALL block submission and show a validation error

#### Scenario: Máquina fuera de servicio
- **WHEN** a user sets a máquina's `estado` to MANTENIMIENTO or BAJA
- **THEN** the system SHALL exclude that máquina from the day's available capacity without requiring any receta to be edited

### Requirement: Las etapas de proceso apuntan a un tipo de máquina
The system SHALL allow defining, for each proceso, an ordered list of operaciones, each declaring the `maquina_tipo` it requires and an optional `capacidad_minima`, never a specific máquina. A concrete máquina SHALL be resolved only when an orden is emitted.

#### Scenario: Etapa que exige capacidad mínima
- **WHEN** an operación declares `maquina_tipo = AMASADORA` and `capacidad_minima = 60` KG
- **THEN** the system SHALL consider only máquinas of that tipo whose `capacidad` is at least 60 KG when resolving the orden

#### Scenario: Ninguna máquina satisface la etapa
- **WHEN** no ACTIVA máquina of the required tipo meets the `capacidad_minima`
- **THEN** the system SHALL emit the orden and SHALL flag that operación as unresolvable, naming the requirement it could not satisfy

### Requirement: Cálculo de bachas
The system SHALL compute, for each operación of an orden, the number of bachas as `techo(cantidad ÷ capacidad_maquina)` and the occupied time as `bachas × (minutos_setup + minutos_por_bacha) + minutos_limpieza`.

#### Scenario: Un lote que no entra en una bacha
- **WHEN** an orden requires 162 kg on a máquina of 60 kg capacity with 5 minutes of setup, 12 minutes per bacha, and 10 minutes of cleaning
- **THEN** the system SHALL compute 3 bachas and 61 minutes of occupancy, not 40

#### Scenario: Bachas visibles en la orden
- **WHEN** a user opens or prints an orden de producción
- **THEN** the system SHALL show, per operación, the resolved máquina and the number of bachas

### Requirement: Ocupación exclusiva o concurrente según la máquina
The system SHALL treat a máquina whose `capacidad_unidad` is expressed in time-consuming batch terms (KG, LITROS, KG_HORA) as exclusive — one orden at a time — and a máquina whose `capacidad_unidad` is expressed in simultaneous holders (CARROS, BANDEJAS) as concurrent up to its `capacidad`.

#### Scenario: Amasadora ocupada por una sola orden
- **WHEN** two ordenes require the same AMASADORA over overlapping time
- **THEN** the system SHALL count the two occupancies as competing for the same exclusive resource

#### Scenario: Cámara compartida por varias órdenes
- **WHEN** three ordenes each require 3 carros of a CAMARA whose capacidad is 12 carros over overlapping time
- **THEN** the system SHALL count 9 of 12 carros in use and SHALL NOT report a conflict

### Requirement: Ocupar la máquina sin ocupar al operario
The system SHALL record `requiere_operario` on each operación, and SHALL count the operación's minutes toward machine occupancy always, but toward labour cost and labour capacity only when `requiere_operario` is true.

#### Scenario: Fermentación sin operario
- **WHEN** an operación of tipo CAMARA declares `requiere_operario = false` and occupies 90 minutes
- **THEN** the system SHALL count 90 minutes of machine occupancy and 0 minutes of labour

### Requirement: Tablero de carga del día
The system SHALL provide, for a given fecha de fabricación, a load board that sums the operaciones of every orden of that date grouped by `maquina_tipo`, showing available units, the shift capacity, the required amount, the resulting utilisation, and a state of Holgado, Ajustado, or Cuello de botella.

#### Scenario: Ver la carga de una fecha
- **WHEN** a user opens the load board for a fecha
- **THEN** the system SHALL display one row per `maquina_tipo` with capacity, requirement, and utilisation, ordered with the most loaded first

#### Scenario: El día no entra
- **WHEN** the required occupancy of any `maquina_tipo` exceeds its shift capacity
- **THEN** the system SHALL show that row as over capacity and SHALL state by how much

### Requirement: Aviso de sobrecapacidad al generar órdenes
The system SHALL warn, before the ordenes of a fecha are confirmed, when the resulting load exceeds the shift capacity of any `maquina_tipo`, and SHALL allow the user to confirm anyway.

#### Scenario: Advertencia en el preview
- **WHEN** a user opens the generation preview for a fecha whose load exceeds a máquina tipo's capacity
- **THEN** the system SHALL show which tipo is over capacity and by how much, before the "Generar" action

#### Scenario: Confirmar de todos modos
- **WHEN** the user confirms generation despite the warning
- **THEN** the system SHALL generate the ordenes and SHALL keep the over-capacity state visible on the load board

### Requirement: Validación blanda entre lote y capacidad de máquina
The system SHALL warn, when a proceso is saved, if its `lote_referencia` is not a multiple of the `capacidad` of any máquina that satisfies its amasado operación, showing how much of the last bacha would be wasted, and SHALL allow the user to save anyway.

#### Scenario: Lote que desperdicia parte de la última bacha
- **WHEN** a user saves a proceso with a 162 kg lote whose amasadora has 60 kg of capacity
- **THEN** the system SHALL warn that the third bacha runs at 42 of 60 kg and SHALL still persist the proceso

### Requirement: Recorrido de máquinas en la orden impresa
The system SHALL print, on the orden de trabajo, a block listing the operaciones in sequence with the resolved máquina, the number of bachas, and the estimated occupancy of each.

#### Scenario: Imprimir la orden con su recorrido
- **WHEN** a user prints an orden de producción
- **THEN** the printed document SHALL include the operaciones block after the fórmula and partición blocks
