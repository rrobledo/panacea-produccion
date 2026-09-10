## MODIFIED Requirements

### Requirement: Register Producto Fabricado and Finalize
The system SHALL, when a user finalizes an Orden de Producción in `EN_PRODUCCION`, require entering — for each of its producto-lines — the Cantidad Fabricada actually obtained (which may differ from the planned Cantidad) with an Ubicación de destino for that good output (selected via the ubicaciones search picker), and an optional Cantidad de Desperdicio with its own Ubicación de Desperdicio and a required Motivo when that quantity is greater than zero — the Ubicación de Desperdicio SHALL be selectable independently of the producto's own Ubicación (e.g. good output goes to Cámara while the desperdicio goes to a discard/compost area). The system SHALL persist that as a Registro de Producto Fabricado before setting the order's estado to `FINALIZADA`. This applies uniformly whether the producto-line is a Producto Final or a Producto Intermedio (e.g. registering that a batch of masa was finalized and stored in a given ubicación for later use).

In the same operation, the system SHALL synchronize the Cantidad Ejecutada into the Programación: for each producto of the order, the Programación row for that `producto_id` and the order's `fecha_fabricacion` SHALL have its Ejecutado (column **E**) set to the total Cantidad Fabricada registered by every `FINALIZADA` order for that producto and that date. The value SHALL count Cantidad Fabricada only and SHALL NOT include Cantidad de Desperdicio. The synchronization SHALL be part of the same transaction as the Registro de Producto Fabricado and the estado change, so that neither can exist without the other; and it SHALL NOT block finalization when the Programación has no row for that producto and date.

#### Scenario: Finalize a completed order
- **WHEN** a user marks an `EN_PRODUCCION` order as finished and, for each producto-line, enters a Cantidad Fabricada and selects an Ubicación
- **THEN** the system SHALL persist a Registro de Producto Fabricado per producto-line, set the order's estado to `FINALIZADA`, and update the Ejecutado of each producto's Programación row for the order's fecha de fabricación

#### Scenario: Cantidad Fabricada differs from planned
- **WHEN** the entered Cantidad Fabricada for a producto-line is less than or greater than its planned Cantidad
- **THEN** the system SHALL accept the entered value without blocking, and SHALL record the actual value rather than the planned one — in the Registro de Producto Fabricado and in the Programación's Ejecutado alike, so that Plan and Ejecutado can be compared

#### Scenario: Ejecutado excludes desperdicio
- **WHEN** a producto-line is finalized with a Cantidad Fabricada and a Cantidad de Desperdicio greater than zero
- **THEN** the Programación's Ejecutado for that producto and date SHALL reflect the Cantidad Fabricada alone, leaving the Cantidad de Desperdicio recorded only in the Registro de Producto Fabricado

#### Scenario: Ejecutado replaces a manually entered value
- **WHEN** the Programación row for a producto and date already has an Ejecutado value typed in by a user, and an order for that producto and date is finalized
- **THEN** the system SHALL replace it with the value computed from the Registro de Producto Fabricado, so the Programación shows what was actually produced

#### Scenario: Ejecutado is recomputed, not incremented
- **WHEN** the Ejecutado for a producto and date is synchronized
- **THEN** the system SHALL compute it as the total of the Cantidad Fabricada already registered for that producto and date, so that synchronizing again yields the same value rather than doubling it

#### Scenario: No Programación row for the producto and date
- **WHEN** an order is finalized and the Programación has no row for one of its productos on the order's fecha de fabricación
- **THEN** the system SHALL finalize the order and persist its Registro de Producto Fabricado normally, skipping the Programación update for that producto without reporting an error

#### Scenario: Missing Ubicación
- **WHEN** a user attempts to finalize without selecting an Ubicación for a producto-line
- **THEN** the system SHALL block finalization and show a validation error on that line, leaving the Programación unchanged

#### Scenario: Registering desperdicio with its own ubicación and motivo
- **WHEN** a user enters a Cantidad de Desperdicio greater than zero for a producto-línea, selects an Ubicación de Desperdicio, and provides a Motivo (e.g. "quemado", "roto", "vencido")
- **THEN** the system SHALL include that Cantidad de Desperdicio, its Ubicación de Desperdicio, and Motivo in the línea's Registro de Producto Fabricado, independently of the Ubicación selected for the good Cantidad Fabricada

#### Scenario: Desperdicio without motivo or ubicación
- **WHEN** a user enters a Cantidad de Desperdicio greater than zero but leaves Motivo empty, or leaves its Ubicación de Desperdicio unselected
- **THEN** the system SHALL block finalization and show a validation error on that line

#### Scenario: No desperdicio on a línea
- **WHEN** a user leaves Cantidad de Desperdicio at zero (or empty) for a producto-línea
- **THEN** the system SHALL finalize that línea without requiring a Motivo or an Ubicación de Desperdicio

#### Scenario: Desperdicio ubicación differs from the producto's own ubicación
- **WHEN** a user selects a different ubicación for Cantidad de Desperdicio than the one selected for Cantidad Fabricada on the same línea
- **THEN** the system SHALL accept and persist both ubicaciones independently, without requiring them to match

## ADDED Requirements

### Requirement: Confirm the Programación Was Updated on Finalization
The system SHALL let the user know, when an Orden de Producción is finalized, that the Cantidad Ejecutada was recorded in the Programación of the order's fecha de fabricación, so that nobody transcribes those numbers by hand a second time.

#### Scenario: Feedback after finalizing
- **WHEN** a user finalizes an order successfully
- **THEN** the system SHALL confirm both that the order was finalized and that the Programación of its fecha de fabricación was updated with the Cantidad Ejecutada
