## MODIFIED Requirements

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
