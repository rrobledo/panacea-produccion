## MODIFIED Requirements

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
