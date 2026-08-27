## ADDED Requirements

### Requirement: List Ubicaciones
The system SHALL display a flat list of ubicaciones (`GET /costos/ubicaciones`) with a single Nombre column (e.g. "Cámara - Sector 1", "Depósito Central - Estante 3") — no parent/child grouping between depósitos and sectores.

#### Scenario: View ubicacion list
- **WHEN** an authenticated user opens "Ubicaciones"
- **THEN** the system SHALL display all ubicaciones returned by the backend in a sortable, searchable grid

### Requirement: Create Ubicación
The system SHALL allow creating a new ubicación with a required Nombre.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nueva Ubicación" form with a Nombre
- **THEN** the system SHALL POST to `/costos/ubicaciones`, show a success confirmation, and return to the ubicacion list

#### Scenario: Missing required field
- **WHEN** a user submits the form without Nombre
- **THEN** the system SHALL block submission and show a validation error

### Requirement: Edit Ubicación
The system SHALL allow editing an existing ubicación's Nombre, with `id` shown read-only.

#### Scenario: Successful update
- **WHEN** a user changes the Nombre of an existing ubicación and saves
- **THEN** the system SHALL PUT the updated record to `/costos/ubicaciones/{id}` and show a success confirmation

### Requirement: Delete Ubicación
The system SHALL allow deleting an ubicación from the list after confirmation, and SHALL prevent deletion (showing an explanatory error) if any Registro de Producto Fabricado references it.

#### Scenario: Confirmed deletion with no registros linked
- **WHEN** a user confirms deletion of an ubicación that no Registro de Producto Fabricado references
- **THEN** the system SHALL DELETE `/costos/ubicaciones/{id}` and refresh the list

#### Scenario: Deletion blocked by linked registros
- **WHEN** a user attempts to delete an ubicación that one or more Registro de Producto Fabricado entries reference
- **THEN** the system SHALL show an error explaining the ubicación is in use and SHALL NOT delete it

### Requirement: Select Ubicación When Finalizing an Orden de Producción
The system SHALL provide a search picker over ubicaciones (requiring a search term) for use when finalizing an Orden de Producción's producto-lines, so each Registro de Producto Fabricado references an existing ubicación rather than a free-text value.

#### Scenario: Search and select an ubicación while finalizing
- **WHEN** a user searches for an ubicación by name while finalizing a producto-línea
- **THEN** the system SHALL query matching ubicaciones and let the user select one for that línea
