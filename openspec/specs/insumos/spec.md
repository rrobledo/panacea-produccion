# insumos Specification

## Purpose
Raw-material CRUD (list, create, edit, delete) for the costos module.

## Requirements

### Requirement: List Insumos
The system SHALL display a list of raw materials (`GET /costos/insumos`) with Nombre, Cantidad, Unidad de Medida, and Precio columns, in Spanish.

#### Scenario: View insumo list
- **WHEN** an authenticated user opens "Insumos"
- **THEN** the system SHALL display all insumos returned by the backend in a sortable, searchable grid

### Requirement: Create Insumo
The system SHALL allow creating a new insumo with Nombre, Cantidad, Unidad de Medida (ML/GR/UN/KG/LT), and Precio.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Insumo" form with all required fields
- **THEN** the system SHALL POST to `/costos/insumos`, show a success confirmation, and return to the insumo list

#### Scenario: Missing required field
- **WHEN** a user submits the form without Nombre, Cantidad, Unidad de Medida, or Precio
- **THEN** the system SHALL block submission and show a validation error on the missing field

### Requirement: Edit Insumo
The system SHALL allow editing an existing insumo's fields, with `id` shown read-only.

#### Scenario: Successful update
- **WHEN** a user changes a field on an existing insumo and saves
- **THEN** the system SHALL PUT the updated record to `/costos/insumos/{id}` and show a success confirmation

### Requirement: Delete Insumo
The system SHALL allow deleting an insumo from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of an insumo row
- **THEN** the system SHALL DELETE `/costos/insumos/{id}` and refresh the list
