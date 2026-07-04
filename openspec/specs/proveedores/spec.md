# proveedores Specification

## Purpose
Supplier CRUD (list, create, edit, delete) for the costos module.

## Requirements

### Requirement: List Proveedores
The system SHALL display a list of suppliers (`GET /costos/proveedores`) with Nombre, CUIT, and Teléfono columns, in Spanish.

#### Scenario: View supplier list
- **WHEN** an authenticated user opens "Proveedores"
- **THEN** the system SHALL display all suppliers returned by the backend in a sortable, searchable grid

### Requirement: Create Proveedor
The system SHALL allow creating a new supplier with Nombre, CUIT, Teléfono, Email, and Dirección.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Proveedor" form with a required Nombre and CUIT
- **THEN** the system SHALL POST to `/costos/proveedores`, show a success confirmation, and return to the supplier list

#### Scenario: Invalid email format
- **WHEN** a user enters a malformed value in the Email field
- **THEN** the system SHALL block submission and show a validation error on that field

### Requirement: Edit Proveedor
The system SHALL allow editing an existing supplier's fields, with `id` shown read-only.

#### Scenario: Successful update
- **WHEN** a user changes a field on an existing supplier and saves
- **THEN** the system SHALL PUT the updated record to `/costos/proveedores/{id}` and show a success confirmation

### Requirement: Delete Proveedor
The system SHALL allow deleting a supplier from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a supplier row
- **THEN** the system SHALL DELETE `/costos/proveedores/{id}` and refresh the list
