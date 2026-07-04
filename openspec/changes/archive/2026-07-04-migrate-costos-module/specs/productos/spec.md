## ADDED Requirements

### Requirement: List Productos
The system SHALL display a list of products (`GET /costos/productos`) with Código, Nombre, Categoría, Referencia, Utilidad, Precio Actual, Lote de Producción, Unidad de Medida, Tiempo de Producción, Habilitado, and Prioridad columns, in Spanish.

#### Scenario: View producto list
- **WHEN** an authenticated user opens "Productos"
- **THEN** the system SHALL display all productos returned by the backend in a sortable, searchable grid, rendering Habilitado as a checkmark/blank indicator

### Requirement: Create Producto
The system SHALL allow creating a new producto with Código, Nombre, Categoría, Habilitado, Producto Final, Id Referencia, Precio Actual, Utilidad, Lote de Producción, Unidad de Medida, Tiempo de Producción, and Prioridad.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Producto" form with all required fields
- **THEN** the system SHALL POST to `/costos/productos`, show a success confirmation, and return to the producto list

### Requirement: Edit Producto
The system SHALL allow editing an existing producto's fields, with `codigo` shown read-only, and SHALL show that producto's nested bill-of-materials (Costos) below the edit form.

#### Scenario: Successful update
- **WHEN** a user changes an editable field on an existing producto and saves
- **THEN** the system SHALL PUT the updated record to `/costos/productos/{id}` and show a success confirmation

### Requirement: Delete Producto
The system SHALL allow deleting a producto from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a producto row
- **THEN** the system SHALL DELETE `/costos/productos/{id}` and refresh the list

### Requirement: Manage Bill-of-Materials (Costos)
The system SHALL allow viewing, adding, and editing the insumo lines that make up a producto's cost, nested under that producto's edit page.

#### Scenario: View cost lines
- **WHEN** a user opens an existing producto's edit page
- **THEN** the system SHALL display its cost lines (`GET /costos/productos/{producto_id}/costos`) showing Insumo, Cantidad, and Unidad de Medida

#### Scenario: Add a cost line
- **WHEN** a user adds a new cost line, selecting an Insumo and entering Cantidad
- **THEN** the system SHALL POST to `/costos/productos/{producto_id}/costos` and refresh the cost-line list

#### Scenario: Edit a cost line
- **WHEN** a user changes the Cantidad on an existing cost line and saves
- **THEN** the system SHALL PUT to `/costos/productos/{producto_id}/costos/{costo_id}` and refresh the cost-line list

#### Scenario: Remove a cost line
- **WHEN** a user confirms deletion of a cost line
- **THEN** the system SHALL DELETE `/costos/productos/{producto_id}/costos/{costo_id}` and refresh the cost-line list
