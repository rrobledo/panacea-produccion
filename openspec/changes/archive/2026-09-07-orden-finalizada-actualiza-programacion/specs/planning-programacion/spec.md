## MODIFIED Requirements

### Requirement: Edit Programación Grid
The system SHALL allow inline editing of Programación cells and SHALL save only the rows that changed, using the same diff-and-save behavior as Planning.

The Ejecutado column (**E**) of each day SHALL additionally be written by the system when an Orden de Producción for that producto and date is finalized, taking the Cantidad Fabricada registered on finalization. It SHALL remain editable so a user can still correct it by hand; a later finalization for that producto and date SHALL overwrite the manual value with the produced one.

#### Scenario: Edit and save changed rows
- **WHEN** a user edits one or more cells and clicks "Actualizar"
- **THEN** the system SHALL POST only the changed rows to `/costos/programacion`, then refresh the grid

#### Scenario: Ejecutado written by finalizing an orden
- **WHEN** an Orden de Producción for a producto and date is finalized with a Cantidad Fabricada
- **THEN** the Ejecutado (E) cell of that producto and date SHALL show that quantity the next time the Programación is loaded, without the user having to type it

#### Scenario: Ejecutado stays editable
- **WHEN** a user edits an Ejecutado (E) cell that was written by finalizing an orden
- **THEN** the system SHALL accept and save the edit like any other Programación cell
