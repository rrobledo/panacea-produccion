# reportes-costos Specification

## Purpose
Read-only analytics — Dashboard, Producción, Ventas por Cliente, Precio Productos, Estimaciones, and Costo Materia Prima (list + detail drill-down).

## Requirements

### Requirement: Dashboard Overview
The system SHALL show a landing dashboard summarizing key production and sales figures sourced from live backend data.

#### Scenario: View dashboard
- **WHEN** an authenticated user opens the home page
- **THEN** the system SHALL display KPI cards and charts built from `/costos/get_produccion_by_category`, `/costos/get_ventas_por_cliente`, and `/costos/ctacteprovresumen`, rather than static placeholder data

### Requirement: Producción Report
The system SHALL display production data by category and by product, and forecasted insumo usage by week and by month, filterable by Año, Mes, and Semana.

#### Scenario: View production breakdown
- **WHEN** a user opens "Producción" and selects Año and Mes
- **THEN** the system SHALL display four panels — Producción por Categoría, Producción por Productos, Insumos Previstos por Semana, and Insumos Previstos Mensual — each sourced from its respective endpoint filtered by the selection, with computed percentage and total/aggregate rows

#### Scenario: Filter by week
- **WHEN** a user selects a specific Semana
- **THEN** the "Insumos Previstos por Semana" panel SHALL refetch scoped to that week

#### Scenario: Print a panel
- **WHEN** a user clicks the print action on an insumos panel
- **THEN** the system SHALL open the browser print dialog for that panel's content only

### Requirement: Ventas por Cliente Report
The system SHALL display sales quantities and totals grouped by period and client, filterable by Año, Mes (including "Todos"), and Cliente.

#### Scenario: View sales by client
- **WHEN** a user opens "Ventas" and selects Año, Mes, and Cliente
- **THEN** the system SHALL display grouped Cantidad (mañana/tarde/total) and Totales (subtotal mañana/tarde/total) columns sourced from `/costos/get_ventas_por_cliente`

#### Scenario: Print the report
- **WHEN** a user clicks the print action
- **THEN** the system SHALL open the browser print dialog for the report content

### Requirement: Precio Productos Report
The system SHALL display a read-only list of current product pricing and margins (`GET /costos/precio_productos`).

#### Scenario: View pricing report
- **WHEN** a user opens "Precio Productos"
- **THEN** the system SHALL display Producto, Precio VA/CP, Costo MP/Fabricación/Total, and Ganancia columns with currency values formatted as Argentine pesos

### Requirement: Estimaciones Report
The system SHALL display a read-only list of product cost/price estimates (`GET /costos/precio_productos`) filterable by Año and Mes, with functioning filters.

#### Scenario: View estimates
- **WHEN** a user opens "Estimaciones"
- **THEN** the system SHALL display Producto, Costo MP/MO/Fabricación/Total, Precio Fabricación, Precio Sugerido Local, Precio Local, and Ganancia Fabricación columns

#### Scenario: Apply a filter
- **WHEN** a user changes the Año or Mes filter
- **THEN** the system SHALL refetch and re-render the list scoped to that filter

### Requirement: Costo Materia Prima Report
The system SHALL display a read-only list of raw-material cost analysis per product, with a detail drill-down per product.

#### Scenario: View cost list
- **WHEN** a user opens "Costo Materia Prima"
- **THEN** the system SHALL display Producto, Lote de Producción, Tiempo de Producción, Precio Venta, Costo MP, Margen Utilidad MP, and monthly estimated Ventas/Costo/Utilidad columns, sourced from `/costos/costos_materia_prima`

#### Scenario: View product cost detail
- **WHEN** a user opens a specific producto's cost detail
- **THEN** the system SHALL display that producto's cost breakdown fields (read-only) plus its nested insumo-level breakdown (Insumo, Cantidad, Costo, Porcentaje del Total) from `/costos/costos_materia_prima/{producto_id}`
