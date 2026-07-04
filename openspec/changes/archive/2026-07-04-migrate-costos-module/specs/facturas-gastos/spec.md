## ADDED Requirements

### Requirement: List Facturas/Gastos
The system SHALL display supplier invoices/expenses (`GET /costos/ctacteprov`) with Fecha, Tipo Movimiento, Proveedor, Observaciones, Categoría, Estado, Importe Total, and Importe Pendiente columns, filterable by Fecha Desde, Fecha Hasta, and Estado (TODOS/PENDIENTE), and showing a summary of Total Facturas Pendientes and Total Gastos en el Periodo (`GET /costos/ctacteprovresumen`).

#### Scenario: View filtered list with summary
- **WHEN** an authenticated user opens "Facturas/Gastos" with a Fecha Desde, Fecha Hasta, and Estado filter applied
- **THEN** the system SHALL request the list and summary endpoints with those filter parameters and display both the matching rows and the summary totals

### Requirement: Create Factura/Gasto
The system SHALL allow creating a new invoice/expense entry with Proveedor (searchable picker), Número de Comprobante, Fecha de Emisión, Fecha de Vencimiento, Importe Total, Categoría, Tipo de Pago, Caja, Observaciones, and up to two image attachments.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nueva Factura/Gasto" form with all required fields
- **THEN** the system SHALL POST to `/costos/ctacteprov`, show a success confirmation, and return to the list

### Requirement: Edit Factura/Gasto
The system SHALL allow editing an existing invoice/expense entry's fields, and SHALL show its nested Pagos and Detalle de Insumos panels below the edit form.

#### Scenario: Successful update
- **WHEN** a user changes a field on an existing factura/gasto and saves
- **THEN** the system SHALL PUT the updated record to `/costos/ctacteprov/{id}` and show a success confirmation

### Requirement: Delete Factura/Gasto
The system SHALL allow deleting a factura/gasto entry from the list after confirmation.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a factura/gasto row
- **THEN** the system SHALL DELETE `/costos/ctacteprov/{id}` and refresh the list

### Requirement: Manage Pagos
The system SHALL allow viewing and recording payments against an existing factura/gasto, nested under its edit page.

#### Scenario: View payments
- **WHEN** a user opens an existing factura/gasto's edit page
- **THEN** the system SHALL display its payments (`GET /costos/ctacteprov/{factura_id}/pagos`) showing Fecha Pago and Importe

#### Scenario: Record a payment
- **WHEN** a user adds a new payment with Número de Comprobante, Fecha de Pago, Importe Total, Tipo de Pago, and Caja
- **THEN** the system SHALL create the payment against the parent factura and refresh the payments list

### Requirement: View Detalle de Insumos
The system SHALL display, on an existing factura/gasto's edit page, the list of insumo line items linked to that entry.

#### Scenario: View linked insumos
- **WHEN** a user opens an existing factura/gasto's edit page
- **THEN** the system SHALL fetch and display `GET /costos/ctacteprov/{entry_id}/insumos`, showing each insumo, cantidad, and cost

#### Scenario: No linked insumos
- **WHEN** a factura/gasto has no linked insumo line items
- **THEN** the system SHALL display an empty state inviting the user to add one, instead of an empty table

### Requirement: Add Insumo to Detalle
The system SHALL allow adding an insumo line item to an existing factura/gasto.

#### Scenario: Successful add
- **WHEN** a user selects an insumo via the picker, enters a cantidad, and confirms "Agregar Insumo"
- **THEN** the system SHALL POST to `/costos/ctacteprov/{entry_id}/insumos` and refresh the Detalle de Insumos list

### Requirement: Remove Insumo from Detalle
The system SHALL allow removing an insumo line item from an existing factura/gasto after confirmation.

#### Scenario: Confirmed removal
- **WHEN** a user confirms removal of an insumo line item
- **THEN** the system SHALL DELETE `/costos/ctacteprov/{entry_id}/insumos/{detalle_id}` and refresh the Detalle de Insumos list
