## 1. Backend — lo fabricado por orden (repo `panacea-produccion-backend`)

- [x] 1.1 Agregar el filtro `orden_id: int | None` a `list_productos_fabricados` en `app/services/ordenes_produccion_service.py` y exponerlo como query param en `app/routers/productos_fabricados.py` (Decision 6)
- [x] 1.2 Test: `GET /costos/productos_fabricados?orden_id=<id>` devuelve solo los registros de esa orden, y sin el parámetro sigue devolviendo todos

## 2. Frontend — la vista previa como lista

- [x] 2.1 Reemplazar en `GenerarOrdenesPreviewPage.jsx` las tarjetas por una única `<table>` con filas de encabezado de orden y filas de producto, dejando intactos `base`, `requestPreview` y el reparto entre cálculo local y recálculo en el servidor (Context, Decision 1)
- [x] 2.2 Fila de encabezado por orden: producto base, responsable, Lote de la Fórmula, total planificado, diferencia y la marca roja cuando el total quede por debajo del lote
- [x] 2.3 Fila por producto: nombre, Cantidad Programada visible, y la Cantidad Planeada editable en la misma lista, conservando las marcas de "Excluida", "Difiere del plan" y el error de cantidad inválida
- [x] 2.4 Verificar que al editar una cantidad el total, la diferencia y el rojo del encabezado se actualizan al instante, sin esperar al backend

## 3. Frontend — selección de órdenes

- [x] 3.1 Estado de deseleccionadas como `Set` de `ordenKey` — se guardan las deseleccionadas, no las seleccionadas, para que "todas marcadas" sea el conjunto vacío y una orden nueva entre seleccionada sola (Decision 3)
- [x] 3.2 Casilla por orden en su fila de encabezado, marcada por defecto
- [x] 3.3 Casilla general de seleccionar/deseleccionar todo, con estado indeterminado cuando la selección es parcial
- [x] 3.4 Atenuar visualmente las órdenes deseleccionadas y sus filas de producto, sin ocultarlas
- [x] 3.5 Al confirmar, mandar en `cantidades` las líneas de las órdenes deseleccionadas con `cantidad: 0`, **solo** en la llamada a `/generar` y nunca en el recálculo del preview, o las órdenes deseleccionadas desaparecerían de la respuesta junto con sus insumos (Decision 2)
- [x] 3.6 El botón de confirmar informa cuántas órdenes se van a crear y queda deshabilitado si no hay ninguna seleccionada
- [x] 3.7 Restringir la validación bloqueante a las órdenes seleccionadas: una cantidad inválida en una orden descartada no impide confirmar, pero la fila sigue marcada con el error (Decision 4)
- [x] 3.8 Verificar que deseleccionar y volver a seleccionar una orden conserva las cantidades editadas

## 4. Frontend — detalle desplegable

- [x] 4.1 Estado de expandidas como `Set` de `ordenKey`, separado del de selección (Decision 3)
- [x] 4.2 Control de expandir/colapsar en la fila de encabezado, con las órdenes colapsadas al abrir la pantalla
- [x] 4.3 Al expandir, insertar las filas de insumos (Insumo, Cantidad entera, Unidad de Medida) de esa orden dentro de la misma tabla
- [x] 4.4 Mantener el indicador de "recalculando" sobre los insumos visibles mientras el backend recalcula
- [x] 4.5 Verificar que se pueden tener varias órdenes expandidas a la vez y que expandir o colapsar no altera la selección

## 5. Frontend — impresión de la orden completa

- [x] 5.1 Crear `src/pages/ordenes-produccion/OrdenPrint.jsx` con su propio `useReactToPrint` y `contentRef`, siguiendo el patrón de `OblejaPrint.jsx` pero con formato de hoja (`@page` A4) y los controles marcados `.no-print` (Decision 5)
- [x] 5.2 Encabezado del impreso: Código, Fecha de Fabricación, Responsable/Área y Estado
- [x] 5.3 Bloque de fechas del ciclo: creación, en producción, finalización y cancelación, mostrando solo las que tengan valor
- [x] 5.4 Tabla de productos con su Cantidad Planeada, y tabla de insumos con Cantidad (entera, vía `formatCantidadInsumo`) y Unidad de Medida
- [x] 5.5 En `OrdenProduccionDetailPage.jsx`, cargar lo fabricado con `GET /costos/productos_fabricados?orden_id=<id>` **solo** cuando la orden esté en `FINALIZADA`
- [x] 5.6 Bloque de lo fabricado en el impreso: por producto, Cantidad Fabricada y Ubicación, más Cantidad de Desperdicio con su Ubicación y Motivo cuando haya desperdicio; se omite entero si la orden no está finalizada
- [x] 5.7 Agregar el botón "Imprimir Orden" en el detalle, dejando "Imprimir Oblea" como acción separada y sin cambios

## 6. Verificación

- [x] 6.1 `pytest` verde en el backend, incluido el test del filtro `orden_id`
- [x] 6.2 `npm run lint` y `npm run build` verdes, sin errores nuevos respecto de la línea de base (hoy: 14 problemas, 7 errores preexistentes)
- [x] 6.3 Reejecutar el recorrido end-to-end de `preview-generacion-ordenes` adaptado a la lista: rojo por debajo del lote, edición, recálculo de insumos, marca de divergencia, validación, y que previsualizar no cree nada
- [x] 6.4 Recorrido nuevo: deseleccionar una orden, confirmar, y verificar en la base que esa orden no existe, que no tiene movimientos de stock, y que las demás sí se crearon
- [x] 6.5 Verificar que la Programación sigue intacta después de confirmar con órdenes deseleccionadas y cantidades editadas
- [x] 6.6 Verificar la impresión con una orden `ASIGNADA` (sin bloque de fabricado) y con una `FINALIZADA` (con fabricado y desperdicio), comprobando que los botones no salen en el impreso y que la oblea sigue funcionando
