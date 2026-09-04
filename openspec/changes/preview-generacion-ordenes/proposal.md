## Why

Hoy "Generar Órdenes de Mañana" es un botón a ciegas: dispara `POST /costos/ordenes-produccion/generar`, crea las órdenes en un solo paso y recién ahí se ve qué salió. No hay forma de saber de antemano qué órdenes se van a crear, ni de detectar el problema que más plata cuesta en la práctica — que lo programado para un producto quede **por debajo del lote de producción de la fórmula**, porque ahí la receta se escala hacia abajo y el lote sale ineficiente. Y una vez generada la orden no se puede corregir la cantidad: el endpoint falla si ya existen órdenes para esa fecha, así que el único remedio es cancelar orden por orden.

Además, las cantidades de insumo de la orden se muestran con decimales largos (`OrdenProduccionInsumoLinea.cantidad` es `Float`, sale de `cantidad_total / lote_produccion × costo.cantidad`), y en planta no se manejan fracciones: nadie pesa `1348.6666666666667`.

## What Changes

- **Pantalla previa antes de generar.** El botón "Generar Órdenes de Mañana" deja de crear las órdenes directamente y pasa a abrir una vista previa de lo que se generaría para la fecha del día siguiente. Las órdenes se crean solo al confirmar desde esa pantalla.
- **La vista previa muestra la brecha contra el lote de la fórmula.** Por cada orden que se generaría (un grupo `producto_base` + Responsable) se muestra el Lote de Producción de la fórmula del producto base, el total planificado en la Programación para ese grupo, y la diferencia entre ambos.
- **Señal en rojo por debajo del lote óptimo.** Cuando el total planificado del grupo es **menor** al Lote de Producción del producto base, la orden se marca en rojo. La comparación es a nivel de orden (grupo de producto base), que es el mismo nivel al que el backend escala la receta.
- **Cantidad editable en la vista previa.** Se puede corregir la Cantidad Planeada de cada línea de producto antes de confirmar. Al editarla, la vista previa recalcula en el momento el total del grupo, la diferencia contra el lote y los insumos resultantes.
- **La edición no toca la Programación.** La cantidad editada se usa solo para generar la orden; `Programacion.plan` queda intacto. Las líneas cuya cantidad quedó distinta de lo programado se marcan visualmente en la vista previa, para que quede explícito que la orden se apartó del plan.
- **BREAKING — las cantidades de insumo se redondean a 0 decimales al persistir.** El redondeo deja de ser cosmético: `OrdenProduccionInsumoLinea.cantidad` y el movimiento de `RESERVA` asociado se guardan ya redondeados, de modo que lo que se muestra es exactamente lo reservado y después consumido. Esto cambia los números de stock respecto del comportamiento actual.
- **Salvaguarda de redondeo:** un insumo cuyo requerimiento exacto es mayor que cero nunca se redondea a cero — se lleva al mínimo de 1 en su unidad. Sin esto, un insumo de `0.4 KG` desaparecería de la orden (el generador ya descarta las líneas con `cantidad <= 0`) y no se reservaría ni se consumiría nada. Ver `design.md`.
- Nuevo endpoint de backend para la vista previa (cálculo sin persistir), y el endpoint de generación pasa a aceptar las cantidades corregidas.

## Capabilities

### New Capabilities

Ninguna. El cambio extiende capacidades ya propuestas.

### Modified Capabilities

> Nota: `ordenes-produccion` y `stock` todavía no están en `openspec/specs/` — se introducen en el change `ordenes-produccion-stock`, que sigue activo sin archivar. Este change asume esa base y depende de ella.

- `ordenes-produccion`: la generación deja de ser un paso único y pasa a ser previsualizar → revisar/corregir → confirmar. Se agregan requisitos para la vista previa, para la comparación contra el Lote de Producción con señal en rojo por debajo del lote, para la edición de la Cantidad Planeada antes de confirmar (sin modificar la Programación, marcando lo que difiere), y se modifica el requisito de generación y el de visualización de la orden para que las cantidades de insumo sean enteras.
- `stock`: el movimiento de `RESERVA` que crea la generación pasa a registrarse con la cantidad redondeada a entero en lugar del float exacto, con el mínimo de 1 para requerimientos no nulos.

## Impact

- **Backend** (`panacea-produccion-backend`, repo separado):
  - `app/services/ordenes_produccion_service.py`: se separa el cálculo (agrupación por `(producto_base_id, responsable)`, explosión de receta) de la persistencia, para poder reusarlo en el preview; se aplica el redondeo con mínimo 1 sobre `insumo_needs`; `generar_ordenes` pasa a aceptar cantidades corregidas por línea.
  - `app/routers/ordenes_produccion.py` + `app/schemas/ordenes_produccion.py`: nuevo `POST /costos/ordenes-produccion/preview` y `GenerarOrdenesRequest` extendido con los overrides de cantidad.
  - `tests/unit/test_ordenes_produccion.py`: cobertura del preview, del redondeo (incluido el caso que redondearía a 0) y de la generación con cantidades corregidas.
- **Frontend** (este repo):
  - `src/pages/ordenes-produccion/OrdenesProduccionPage.jsx`: el botón pasa a abrir la vista previa en lugar de llamar a `generar`.
  - Nuevo componente de vista previa en `src/pages/ordenes-produccion/`, con el resumen por orden (lote de fórmula, planificado, diferencia), el resaltado en rojo, y la edición de cantidad por línea.
  - `OrdenProduccionDetailPage.jsx` y `OblejaPrint.jsx`: cantidades de insumo sin decimales.
- **Datos**: no requiere migración — `OrdenProduccionInsumoLinea.cantidad` sigue siendo `Float`, solo cambian los valores que se escriben de ahora en más. Las órdenes ya existentes conservan sus decimales.

## Fuera de Alcance

- Cambiar el nivel de agrupación de las órdenes, o permitir dividir/fusionar grupos desde la vista previa.
- Editar la lista de insumos a mano en la vista previa: los insumos siempre se derivan de la receta y de la cantidad.
- Sugerir o forzar automáticamente el redondeo de la cantidad planificada al lote óptimo — la vista previa señala la brecha, la decisión sigue siendo del usuario.
- Regenerar o corregir órdenes ya creadas.
