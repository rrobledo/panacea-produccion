# planning-programacion Specification

## Purpose
Server-driven-column editable grids for annual Planning and weekly Programación, with diffed bulk-update save.

## Requirements

### Requirement: View Planning Grid
The system SHALL display the annual production planning grid whose columns are defined by the backend (`GET /costos/planning_columnas?anio=`) and whose rows come from `GET /costos/planning?anio=`, filterable by Año.

#### Scenario: View planning for a given year
- **WHEN** a user opens "Planning" and selects a year
- **THEN** the system SHALL fetch that year's columns and rows and render them together as one table

### Requirement: Edit Planning Grid
The system SHALL allow inline editing of Planning cells and SHALL save only the rows that changed.

#### Scenario: Edit and save changed rows
- **WHEN** a user edits one or more cells and clicks "Actualizar"
- **THEN** the system SHALL POST only the changed rows (each including its `id` and the changed fields) to `/costos/planning`, then refresh the grid

#### Scenario: No changes made
- **WHEN** a user clicks "Actualizar" without having changed any cell
- **THEN** the system SHALL NOT send a request

#### Scenario: Visual indication of unsaved edits
- **WHEN** a user edits a cell
- **THEN** the system SHALL visually mark that cell as changed until the update is saved

### Requirement: View Programación Grid
The system SHALL display the weekly production schedule grid whose columns are defined by the backend (`GET /costos/programacion_columnas`) and whose rows come from `GET /costos/programacion`, filterable by Año, Mes, Semana, and Responsable.

#### Scenario: View schedule for given filters
- **WHEN** a user opens "Programación" and selects Año, Mes, Semana, and Responsable
- **THEN** the system SHALL fetch that combination's columns and rows and render them together as one table

### Requirement: Edit Programación Grid
The system SHALL allow inline editing of Programación cells and SHALL save only the rows that changed, using the same diff-and-save behavior as Planning.

#### Scenario: Edit and save changed rows
- **WHEN** a user edits one or more cells and clicks "Actualizar"
- **THEN** the system SHALL POST only the changed rows to `/costos/programacion`, then refresh the grid
