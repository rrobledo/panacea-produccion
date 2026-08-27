## ADDED Requirements

### Requirement: List Clientes
The system SHALL display a list of clients (`GET /costos/clientes`) with Nombre and Contacto columns, in Spanish.

#### Scenario: View cliente list
- **WHEN** an authenticated user opens "Clientes"
- **THEN** the system SHALL display all clientes returned by the backend in a sortable, searchable grid

### Requirement: Create Cliente
The system SHALL allow creating a new cliente with Nombre (required) and Contacto (free text: phone or email).

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Cliente" form with a Nombre
- **THEN** the system SHALL POST to `/costos/clientes`, show a success confirmation, and return to the cliente list

#### Scenario: Missing required field
- **WHEN** a user submits the form without Nombre
- **THEN** the system SHALL block submission and show a validation error on the missing field

### Requirement: Edit Cliente
The system SHALL allow editing an existing cliente's Nombre and Contacto, with `id` shown read-only.

#### Scenario: Successful update
- **WHEN** a user changes a field on an existing cliente and saves
- **THEN** the system SHALL PUT the updated record to `/costos/clientes/{id}` and show a success confirmation

### Requirement: Delete Cliente
The system SHALL allow deleting a cliente from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a cliente row
- **THEN** the system SHALL DELETE `/costos/clientes/{id}` and refresh the list

### Requirement: Select Cliente from Pedido
The system SHALL provide a search picker over clientes (requiring a search term) for use when creating or editing a Pedido, so pedidos reference an existing cliente rather than a free-text name.

#### Scenario: Search and select a cliente while creating a pedido
- **WHEN** a user searches for a cliente by name while filling out a Pedido form
- **THEN** the system SHALL query matching clientes and let the user select one to associate with the pedido
