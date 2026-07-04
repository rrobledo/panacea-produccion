## MODIFIED Requirements

### Requirement: Create Factura/Gasto
The system SHALL allow creating a new invoice/expense entry with Proveedor (searchable picker requiring a search term before querying), Número de Comprobante, Fecha de Emisión, Fecha de Vencimiento, Importe Total, Categoría, Tipo de Pago, Caja, Observaciones, and up to two image attachments.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nueva Factura/Gasto" form with all required fields
- **THEN** the system SHALL POST to `/costos/ctacteprov`, show a success confirmation, and return to the list

#### Scenario: Selecting a Proveedor without retrieving the full list
- **WHEN** a user opens the Proveedor picker on this form
- **THEN** the system SHALL NOT query the backend until the user has typed a minimum search term, instead showing a prompt to type to search

### Requirement: Edit Factura/Gasto
The system SHALL allow editing an existing invoice/expense entry's fields, and SHALL show its nested Pagos and Detalle de Insumos panels below the edit form. Saving the form SHALL persist the master fields and every staged change in the Pagos and Detalle de Insumos panels together, rather than persisting detail changes as they are made.

#### Scenario: Successful update with no pending detail changes
- **WHEN** a user changes a field on an existing factura/gasto and saves, with no pending Pagos or Detalle de Insumos changes
- **THEN** the system SHALL PUT the updated record to `/costos/ctacteprov/{id}` and show a success confirmation

#### Scenario: Successful update with pending detail changes
- **WHEN** a user saves an existing factura/gasto that has staged (unsaved) Pagos and/or Detalle de Insumos changes
- **THEN** the system SHALL PUT the master record first, and only if that succeeds, persist every staged Pagos and Detalle de Insumos change, reporting success once all of it is persisted

#### Scenario: A staged detail change fails to persist
- **WHEN** the master fields save successfully but a staged Pagos or Detalle de Insumos change fails to persist
- **THEN** the system SHALL keep the user on the edit page, indicate which change failed, and keep it staged so the user can retry by saving again

#### Scenario: Discarding pending changes
- **WHEN** a user has staged but unsaved Pagos or Detalle de Insumos changes and attempts to leave the edit page (e.g. via "Cancelar")
- **THEN** the system SHALL prompt for confirmation before discarding the pending changes

### Requirement: Manage Pagos
The system SHALL allow staging new payments against an existing factura/gasto, nested under its edit page, and SHALL persist staged payments together with the factura/gasto's own save action rather than persisting each payment immediately.

#### Scenario: View payments
- **WHEN** a user opens an existing factura/gasto's edit page
- **THEN** the system SHALL display its payments (`GET /costos/ctacteprov/{factura_id}/pagos`) showing Fecha Pago and Importe

#### Scenario: Stage a payment
- **WHEN** a user adds a new payment with Número de Comprobante, Fecha de Pago, Importe Total, Tipo de Pago, and Caja, and confirms
- **THEN** the system SHALL add the payment to the displayed list marked as pending, without calling the backend

#### Scenario: Committing a staged payment on save
- **WHEN** the parent factura/gasto's master fields save successfully
- **THEN** the system SHALL create every staged payment against the parent factura, and SHALL only report success once every staged payment has been persisted

### Requirement: Add Insumo to Detalle
The system SHALL allow staging an insumo line item addition to an existing factura/gasto, and SHALL persist it together with the factura/gasto's own save action rather than persisting it immediately.

#### Scenario: Stage adding an insumo
- **WHEN** a user selects an insumo via the picker (requiring a search term before querying), enters a cantidad, and confirms "Agregar Insumo"
- **THEN** the system SHALL add the line to the displayed Detalle de Insumos list marked as pending, without calling the backend

#### Scenario: Committing a staged insumo addition on save
- **WHEN** the parent factura/gasto's master fields save successfully
- **THEN** the system SHALL POST every staged insumo addition to `/costos/ctacteprov/{entry_id}/insumos`, and SHALL only report success once every staged addition has been persisted

### Requirement: Remove Insumo from Detalle
The system SHALL allow staging removal of an insumo line item from an existing factura/gasto after confirmation, and SHALL persist the removal together with the factura/gasto's own save action rather than persisting it immediately.

#### Scenario: Stage a removal
- **WHEN** a user confirms removal of an insumo line item
- **THEN** the system SHALL remove the line from the displayed Detalle de Insumos list and mark the removal as pending, without calling the backend

#### Scenario: Committing a staged removal on save
- **WHEN** the parent factura/gasto's master fields save successfully
- **THEN** the system SHALL DELETE `/costos/ctacteprov/{entry_id}/insumos/{detalle_id}` for every staged removal, and SHALL only report success once every staged removal has been persisted

#### Scenario: Resolving insumo names without retrieving the full list
- **WHEN** the Detalle de Insumos panel displays existing line items
- **THEN** the system SHALL resolve each item's insumo name by fetching only that specific insumo, not the entire insumos table
