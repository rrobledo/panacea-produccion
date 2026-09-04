## Why

La vista previa de generación (`preview-generacion-ordenes`) muestra una tarjeta grande por orden, con las tablas de productos e insumos siempre desplegadas. Con dos órdenes entra; con las diez o quince de un día normal la pantalla se vuelve un scroll largo donde no se puede comparar de un vistazo qué grupos quedaron por debajo del lote, que es justamente para lo que se hizo. Y es todo o nada: si una sola orden no se quiere generar, la única salida es poner en 0 la cantidad de cada una de sus líneas.

Del lado de la orden ya generada, lo único imprimible es la oblea, que a propósito lleva solo fecha, código, responsable y productos. No hay forma de imprimir la orden completa para la carpeta de producción ni de dejar constancia en papel de una orden cerrada.

## What Changes

- **La vista previa pasa a ser una lista.** Se reemplazan las tarjetas por una lista compacta con una fila de encabezado por orden (producto base, responsable, lote de la fórmula, total planificado, diferencia y la marca roja) y debajo una fila por cada producto, con su Cantidad Planeada editable en la misma lista.
- **Selección de qué órdenes generar.** Cada orden tiene una casilla, **todas marcadas por defecto**. Se genera solo lo seleccionado. Hay una casilla general para marcar o desmarcar todo.
- **Detalle desplegable por orden.** Cada fila de encabezado se puede expandir en la misma lista para ver los insumos calculados de esa orden, sin salir de la pantalla ni perder de vista el resto. Se pueden tener varias abiertas a la vez.
- **Impresión completa de la Orden de Producción.** En el detalle de una orden ya generada se agrega "Imprimir Orden", que imprime una hoja con encabezado (código, fecha de fabricación, responsable, estado), las fechas del ciclo (creación, inicio de producción, finalización o cancelación), los productos con su Cantidad Planeada, los insumos con Cantidad y Unidad, y —cuando la orden está finalizada— lo realmente fabricado con su ubicación, el desperdicio y su motivo.
- **La oblea se mantiene tal cual.** Sigue siendo una acción aparte, con su formato de 10×10 cm y sin detalle de insumos.

## Capabilities

### New Capabilities

Ninguna. El cambio extiende una capacidad existente.

### Modified Capabilities

> Nota de dependencia: `ordenes-produccion` no está todavía en `openspec/specs/` — la introduce `ordenes-produccion-stock` y la extiende `preview-generacion-ordenes`, y **ninguno de los dos está archivado**. Este change se apoya en ambos y conviene archivarlos, en ese orden, antes que a este.

- `ordenes-produccion`: la vista previa pasa de tarjetas a lista con edición en línea y detalle desplegable; se agrega la selección de qué órdenes generar (todas por defecto); y se agrega la impresión completa de una orden generada, junto a la oblea que ya existía.

## Impact

- **Backend** (`panacea-produccion-backend`, repo separado): `GET /costos/productos_fabricados` gana un filtro `orden_id`, para que la impresión de una orden finalizada pueda traer lo fabricado sin descargar el registro entero. Es el único cambio de backend; la generación y el preview ya aceptan todo lo que hace falta — las órdenes no seleccionadas se resuelven mandando sus líneas en `cantidades` con 0, que el backend ya interpreta como "excluir".
- **Frontend** (este repo):
  - `src/pages/ordenes-produccion/GenerarOrdenesPreviewPage.jsx`: se reescribe el cuerpo como lista con selección, edición en línea y filas expandibles.
  - Nuevo componente de impresión de la orden completa en `src/pages/ordenes-produccion/`, siguiendo el patrón de `react-to-print` que ya usan `OblejaPrint.jsx` y `components/reports/PrintableReport.jsx`.
  - `OrdenProduccionDetailPage.jsx`: nueva acción "Imprimir Orden" y, en órdenes finalizadas, la carga de lo fabricado.
- No cambia el cálculo de órdenes, ni la agrupación, ni el redondeo de insumos.

## Fuera de Alcance

- Exportar la vista previa o la orden a CSV/Excel.
- Imprimir varias órdenes de una sola vez desde la lista de la vista previa.
- Editar la selección o las cantidades de una orden ya generada.
- Cambiar el formato o el contenido de la oblea.
