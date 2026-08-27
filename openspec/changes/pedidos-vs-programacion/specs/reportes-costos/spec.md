## ADDED Requirements

### Requirement: Disponibilidad de Programación Report
The system SHALL display a read-only report comparing, per producto and week, the quantity programmed (Programación) against the quantity committed in pedidos, sourced from `GET /costos/disponibilidad_programacion`, filterable by Año, Mes, and Semana.

#### Scenario: View disponibilidad report
- **WHEN** a user opens "Disponibilidad de Programación" and selects Año, Mes, and Semana
- **THEN** the system SHALL display, per producto, Programado, Pedido, Disponible, and an Estado indicator (OK / En Riesgo when Disponible is negative)

#### Scenario: Identify which clientes to notify
- **WHEN** a producto's row shows a negative Disponible (En Riesgo)
- **THEN** the system SHALL let the user drill down to the pedidos and clientes contributing to that producto's committed quantity for that week, so the user can contact them manually

#### Scenario: Apply a filter
- **WHEN** a user changes the Año, Mes, or Semana filter
- **THEN** the system SHALL refetch and re-render the report scoped to that filter
