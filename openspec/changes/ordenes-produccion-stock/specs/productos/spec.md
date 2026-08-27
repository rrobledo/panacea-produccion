## MODIFIED Requirements

### Requirement: Create Producto
The system SHALL allow creating a new producto with Código, Nombre, Categoría, Habilitado, Producto Final, Id Referencia, Precio Actual, Utilidad, Lote de Producción, Unidad de Medida, Tiempo de Producción, Prioridad, and an optional Producto Base (linking this producto to an intermediate producto — one with Producto Final off — it is assembled from, via a search picker restricted to productos with Producto Final off), and SHALL let the user stage bill-of-materials (Costos) lines before the producto exists, persisting them immediately after the producto itself is created.

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

#### Scenario: Linking a producto to a producto base (intermedio)
- **WHEN** a user selects a Producto Base via the search picker while creating or editing a producto
- **THEN** the system SHALL associate that producto with the selected producto's `id` as `producto_base_id`, restricting the picker to productos with Producto Final off, and SHALL allow leaving it unset for productos not assembled from a shared intermediate

#### Scenario: A producto cannot reference itself or create a cycle as producto base
- **WHEN** a user attempts to select a producto as its own Producto Base, or selects one that would create a circular reference (A based on B based on A)
- **THEN** the system SHALL block the selection and show a validation error

## ADDED Requirements

### Requirement: Producto Costos Optional When Linked to a Producto Base
The system SHALL treat a producto's own bill-of-materials (Costos) as optional when it has a `producto_base_id` set, since part of its raw-material breakdown is expected to come from the linked producto base's own Costos instead (e.g. medialunas' Costos only need to list the filling/topping insumos beyond the shared dough).

#### Scenario: View a producto linked to a producto base with no own Costos lines
- **WHEN** a user opens the edit page of a producto that has `producto_base_id` set and no Costos lines of its own
- **THEN** the system SHALL display the empty Costos list without treating it as an error, and SHALL show which producto base it is linked to

### Requirement: Distinguish Producto Final from Producto Intermedio in Listings
The system SHALL let a user filter or visually distinguish, in the Productos list, productos that are Producto Final from those that are not (intermediate productos such as a shared dough), reusing the existing `is_producto` field.

#### Scenario: Filter to intermediate productos only
- **WHEN** a user filters the Productos list to Producto Final = No
- **THEN** the system SHALL display only productos with `is_producto` false
