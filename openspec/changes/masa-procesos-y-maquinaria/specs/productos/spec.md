## MODIFIED Requirements

### Requirement: List Productos
The system SHALL display a list of products (`GET /costos/productos`) with Código, Nombre, Categoría, Naturaleza, Vendible, Precio Actual, Unidad Base, Peso Unitario, and Habilitado columns, in Spanish. The columns Lote de Producción and Tiempo de Producción SHALL no longer appear: they now belong to the proceso rather than to the producto. Referencia, Utilidad and Prioridad SHALL remain available: the frontend does not compute anything from them, but the backend does — `prioridad` orders both this list and the Programación grid, `utilidad` feeds the suggested price of the cost report, and `ref_id` is grouped on by the analytics queries.

#### Scenario: View producto list
- **WHEN** an authenticated user opens "Productos"
- **THEN** the system SHALL display all productos returned by the backend in a sortable, searchable grid, rendering Habilitado and Vendible as checkmark/blank indicators

#### Scenario: Filter by naturaleza
- **WHEN** a user filters the list by Naturaleza
- **THEN** the system SHALL show only the articles of that naturaleza, replacing the former `is_producto` filter

### Requirement: Create Producto
The system SHALL allow creating a new producto with Código, Nombre, Categoría, Habilitado, Naturaleza, Vendible, Precio Actual, Unidad Base, Id Referencia, Utilidad, Prioridad, and — when Unidad Base is UN — Peso Unitario. The system SHALL NOT ask for Lote de Producción or Tiempo de Producción, which now belong to the proceso. Bill-of-materials lines are no longer staged on this form: what a producto is made of is declared by a proceso.

#### Scenario: Successful creation
- **WHEN** a user submits the "Nuevo Producto" form with all required fields
- **THEN** the system SHALL POST to `/costos/productos`, show a success confirmation, and return to the producto list

#### Scenario: Unidad Base UN requires Peso Unitario
- **WHEN** a user selects Unidad Base UN and leaves Peso Unitario empty
- **THEN** the system SHALL block submission and show a validation error on Peso Unitario

#### Scenario: Unidad Base KG hides Peso Unitario
- **WHEN** a user selects Unidad Base KG
- **THEN** the system SHALL hide the Peso Unitario field and SHALL NOT require it

#### Scenario: Artículo vendible y componente
- **WHEN** a user creates a producto with Naturaleza TERMINADO and Vendible marked
- **THEN** the system SHALL allow that producto to be selected later as an ENTRADA of another proceso, without any further flag

## REMOVED Requirements

### Requirement: Manage Bill-of-Materials (Costos)
**Reason**: The flat producto → insumos bill of materials cannot express a masa shared by several products of different gramaje, nor a line pointing at another producto. It is replaced by the `procesos` capability, where a line carries `rol`, `gramaje_g`, `merma_pct`, `rendimiento_pct`, and `minutos_directos`, and can point at any article.

**Migration**: Every existing `costos` row is backfilled as a `proceso_linea` of rol ENTRADA on the proceso of the producto that owned it, preserving `insumo` and `cantidad` unchanged. Each producto without a `producto_base_id` gets a degenerate 1:1 proceso carrying its former `lote_produccion`. Each producto with a `producto_base_id` becomes a SALIDA line of its base's division proceso, with `gramaje_g` left empty for the plant survey. The `/costos/productos/{producto_id}/costos` endpoints stay readable until the survey completes and the new engine is switched on.
