# facturas-gastos Specification

## Purpose
Supplier invoice/expense (`ctacteprov`) CRUD with date/estado filtering and pending/total summary, nested Pagos CRUD, and nested Detalle de Insumos (view/add/remove line items tied to a factura).

## Requirements

### Requirement: List Facturas/Gastos
The system SHALL display supplier invoices/expenses (`GET /costos/ctacteprov`) with Fecha, Tipo Movimiento, Proveedor, Observaciones, Categoría, Estado, Importe Total, and Importe Pendiente columns, filterable by Fecha Desde, Fecha Hasta, and Estado (TODOS/PENDIENTE), and showing a summary of Total Facturas Pendientes and Total Gastos en el Periodo (`GET /costos/ctacteprovresumen`).

#### Scenario: View filtered list with summary
- **WHEN** an authenticated user opens "Facturas/Gastos" with a Fecha Desde, Fecha Hasta, and Estado filter applied
- **THEN** the system SHALL request the list and summary endpoints with those filter parameters and display both the matching rows and the summary totals

### Requirement: Create Factura/Gasto
The system SHALL allow creating a new invoice/expense entry with Proveedor (searchable picker), Número de Comprobante, Fecha de Emisión, Fecha de Vencimiento, Importe Total, Categoría, Tipo de Pago, Caja, Observaciones, and up to two image attachments, and SHALL let the user stage Detalle de Insumos line items before the entry exists, submitting them together with the master fields in the same request.

#### Scenario: Successful creation with no staged insumos
- **WHEN** a user submits the "Nueva Factura/Gasto" form with all required fields and no staged Detalle de Insumos lines
- **THEN** the system SHALL POST to `/costos/ctacteprov`, show a success confirmation, and return to the list

#### Scenario: Staging an insumo line before the entry exists
- **WHEN** a user is filling out the "Nueva Factura/Gasto" form and adds an insumo line, selecting an Insumo (via a search picker requiring a search term) and entering Cantidad
- **THEN** the system SHALL add the line to a displayed list marked as pending, without calling the backend

#### Scenario: Successful creation with staged insumos
- **WHEN** a user submits the "Nueva Factura/Gasto" form with one or more staged Detalle de Insumos lines
- **THEN** the system SHALL include those lines as an `insumos` array in the same `POST /costos/ctacteprov` request as the master fields, persisting the entry and its insumo lines in a single request

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

### Requirement: Delete Factura/Gasto
The system SHALL allow deleting a factura/gasto entry from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a factura/gasto row
- **THEN** the system SHALL DELETE `/costos/ctacteprov/{id}` and refresh the list

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

### Requirement: View Detalle de Insumos
The system SHALL display, on an existing factura/gasto's edit page, the list of insumo line items linked to that entry.

#### Scenario: View linked insumos
- **WHEN** a user opens an existing factura/gasto's edit page
- **THEN** the system SHALL fetch and display `GET /costos/ctacteprov/{entry_id}/insumos`, showing each insumo, cantidad, and cost

#### Scenario: No linked insumos
- **WHEN** a factura/gasto has no linked insumo line items
- **THEN** the system SHALL display an empty state inviting the user to add one, instead of an empty table

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
