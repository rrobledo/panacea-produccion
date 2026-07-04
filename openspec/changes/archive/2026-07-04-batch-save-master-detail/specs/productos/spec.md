## MODIFIED Requirements

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
