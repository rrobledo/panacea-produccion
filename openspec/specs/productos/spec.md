# productos Specification

## Purpose
Product CRUD (list, create, edit, delete) plus nested bill-of-materials "costos" sub-resource CRUD.

## Requirements

### Requirement: List Productos
The system SHALL display a list of products (`GET /costos/productos`) with Código, Nombre, Categoría, Referencia, Utilidad, Precio Actual, Lote de Producción, Unidad de Medida, Tiempo de Producción, Habilitado, and Prioridad columns, in Spanish.

#### Scenario: View producto list
- **WHEN** an authenticated user opens "Productos"
- **THEN** the system SHALL display all productos returned by the backend in a sortable, searchable grid, rendering Habilitado as a checkmark/blank indicator

### Requirement: Create Producto
The system SHALL allow creating a new producto with Código, Nombre, Categoría, Habilitado, Producto Final, Id Referencia, Precio Actual, Utilidad, Lote de Producción, Unidad de Medida, Tiempo de Producción, and Prioridad, and SHALL let the user stage bill-of-materials (Costos) lines before the producto exists, persisting them immediately after the producto itself is created.

#### Scenario: Successful creation with no staged cost lines
- **WHEN** a user submits the "Nuevo Producto" form with all required fields and no staged cost lines
- **THEN** the system SHALL POST to `/costos/productos`, show a success confirmation, and return to the producto list

#### Scenario: Staging a cost line before the producto exists
- **WHEN** a user is filling out the "Nuevo Producto" form and adds a cost line, selecting an Insumo (via a search picker requiring a search term) and entering Cantidad
- **THEN** the system SHALL add the line to a displayed list marked as pending, without calling the backend

#### Scenario: Successful creation with staged cost lines
- **WHEN** a user submits the "Nuevo Producto" form with one or more staged cost lines
- **THEN** the system SHALL POST the producto fields to `/costos/productos` first, and only if that succeeds, POST each staged cost line to `/costos/productos/{producto_id}/costos` using the newly created producto's id, reporting a single combined success once all of it is persisted

#### Scenario: Producto created but a staged cost line fails to persist
- **WHEN** the producto is created successfully but one or more staged cost lines fail to persist
- **THEN** the system SHALL inform the user the producto was created and which cost line(s) failed, and navigate to the new producto's edit page so the user can retry adding those lines there

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
The system SHALL allow staging additions, edits, and removals of the insumo lines that make up a producto's cost, nested under that producto's edit page, and SHALL persist all staged changes together with the producto's own save action rather than persisting each change immediately.

#### Scenario: View cost lines
- **WHEN** a user opens an existing producto's edit page
- **THEN** the system SHALL display its cost lines (`GET /costos/productos/{producto_id}/costos`) showing Insumo, Cantidad, and Unidad de Medida

#### Scenario: Stage a new cost line
- **WHEN** a user adds a new cost line, selecting an Insumo (via a search picker requiring a search term) and entering Cantidad, and confirms
- **THEN** the system SHALL add the line to the displayed list marked as pending, without calling the backend

#### Scenario: Stage an edit to a cost line
- **WHEN** a user changes the Cantidad on an existing cost line and confirms
- **THEN** the system SHALL update the displayed line and mark it as pending, without calling the backend

#### Scenario: Stage removal of a cost line
- **WHEN** a user confirms deletion of a cost line
- **THEN** the system SHALL remove the line from the displayed list and mark the removal as pending, without calling the backend

#### Scenario: Committing staged changes on save
- **WHEN** a user saves the producto's edit form and its master fields are updated successfully
- **THEN** the system SHALL, for every staged cost-line change, call `POST` (new lines), `PUT` (edited lines), or `DELETE` (removed lines) against `/costos/productos/{producto_id}/costos[/{costo_id}]`, and SHALL only report success once every staged change has been persisted

#### Scenario: A staged detail change fails to persist
- **WHEN** the producto's master fields save successfully but one or more staged cost-line changes fail to persist
- **THEN** the system SHALL keep the user on the edit page, indicate which change(s) failed, and keep those changes staged so the user can retry by saving again

#### Scenario: Discarding pending changes
- **WHEN** a user has staged but unsaved cost-line changes and attempts to leave the edit page (e.g. via "Cancelar")
- **THEN** the system SHALL prompt for confirmation before discarding the pending changes
