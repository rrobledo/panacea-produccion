## MODIFIED Requirements

### Requirement: Edit Insumo
The system SHALL allow editing an existing insumo's Nombre, Unidad de Medida, and Precio, with `id` and Cantidad shown read-only. Cantidad SHALL only change via recorded stock movements (Órdenes de Producción or a manual "Ajustar Stock" adjustment — see the `stock` capability), never via direct edit of the field.

#### Scenario: Successful update
- **WHEN** a user changes Nombre, Unidad de Medida, or Precio on an existing insumo and saves
- **THEN** the system SHALL PUT the updated record to `/costos/insumos/{id}` and show a success confirmation

#### Scenario: Cantidad shown read-only
- **WHEN** a user opens an existing insumo's edit form
- **THEN** the system SHALL render Cantidad as read-only and SHALL surface an "Ajustar Stock" action instead of an editable field for it
