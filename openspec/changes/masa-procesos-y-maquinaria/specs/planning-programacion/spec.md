## MODIFIED Requirements

### Requirement: View Programación Grid
The system SHALL display the weekly production schedule grid whose columns are defined by the backend (`GET /costos/programacion_columnas`) and whose rows come from `GET /costos/programacion`, filterable by Año, Mes, Semana, and Responsable. Each row SHALL show the producto's `unidad_base`, so that a producto sold by the kilo is read as kilos and one sold by the unit as units. Quantities SHALL remain whole numbers: a producto in KG is programmed in whole kilos.

#### Scenario: View schedule for given filters
- **WHEN** a user opens "Programación" and selects Año, Mes, Semana, and Responsable
- **THEN** the system SHALL fetch that combination's columns and rows and render them together as one table

#### Scenario: Producto medido en kilos
- **WHEN** a row's producto has `unidad_base = KG`
- **THEN** the system SHALL label that row's quantities as kilos and SHALL accept only whole numbers

## ADDED Requirements

### Requirement: Una sola fila de Programación por producto y fecha
The system SHALL enforce that at most one Programación row exists for a given `(producto_id, fecha)`, and SHALL reconcile the duplicate rows currently present in production before enforcing it.

#### Scenario: Intento de crear una fila duplicada
- **WHEN** a save would create a second row for a `(producto_id, fecha)` that already has one
- **THEN** the system SHALL reject the write and report the conflicting row

#### Scenario: Reconciliación de duplicados existentes
- **WHEN** the migration finds several rows for the same `(producto_id, fecha)`
- **THEN** the system SHALL merge them by summing `plan` and `prod`, keep one row, and record what was merged
