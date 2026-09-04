## Context

`GenerarOrdenesPreviewPage.jsx` hoy renderiza una tarjeta (`.card`) por orden, cada una con su bloque de métricas, su tabla de productos con la cantidad editable y su tabla de insumos siempre visible. Funciona con dos órdenes; con las diez o quince de un día real el usuario tiene que scrollear para encontrar cuáles quedaron por debajo del lote.

La página ya resuelve tres cosas que este change debe conservar intactas:

1. **La estructura viene del primer preview.** `base` guarda la respuesta inicial sin overrides y no se reemplaza en los recálculos: si una orden queda sin líneas el backend deja de devolverla, y sin esa copia estable la fila desaparecería sin forma de volver atrás.
2. **Cálculo local vs. servidor.** El total del grupo, la brecha contra el lote y la marca roja se calculan en el cliente (aritmética entera) para responder sin latencia; los insumos se piden al backend con `useDebounce` a 400 ms porque explotar la receta necesita los `Costos`.
3. **Efectos sin `setState` síncrono.** `requestPreview` es pura y devuelve datos; el `setState` vive en los callbacks del `.then`. El compilador de React marca como error cualquier llamada síncrona desde un efecto a una función que contenga `setState`, aun cuando ocurra después del `await`.

Del lado de la impresión, el proyecto ya tiene dos usos de `react-to-print`: `OblejaPrint.jsx` (un `useReactToPrint` con `contentRef` sobre un bloque acotado, con su `@media print` y `@page` embebidos) y `components/reports/PrintableReport.jsx` (encabezado, tabla y pie genéricos, con los controles marcados `.no-print`). `index.css` ya define `.no-print` y `.print-only` dentro de su `@media print`.

Lo fabricado realmente **no** viaja en la orden: `OrdenProduccionRead` no incluye `productos_fabricados`, y `GET /costos/productos_fabricados` filtra por producto, ubicación y fechas, pero no por orden.

## Goals / Non-Goals

**Goals:**

- Que todas las órdenes a generar se vean de una, con su brecha contra el lote legible sin desplegar nada.
- Editar cantidades sin salir de la lista.
- Elegir qué órdenes generar, con todas marcadas por defecto.
- Ver los insumos de una orden puntual sin perder de vista el resto.
- Poder imprimir la orden completa, conservando la oblea como acción aparte.

**Non-Goals:**

- Tocar el cálculo de órdenes, la agrupación o el redondeo de insumos.
- Exportar a CSV/Excel.
- Imprimir varias órdenes de una vez.
- Modificar la oblea.

## Decisions

### Decision 1 — Una sola tabla con filas de encabezado, no tablas anidadas

La lista es una única `<table>` en la que conviven dos tipos de fila: la de encabezado de orden (casilla, expandir, producto base, responsable, lote, planificado, diferencia) y las de producto (nombre, cantidad programada, cantidad planeada editable, marcas). Las filas de insumos aparecen como filas adicionales cuando la orden está expandida.

*Por qué:* una tabla por orden anidada dentro de otra tabla desalinea las columnas entre órdenes, que es justo lo que hace comparable a la lista. Con una sola tabla, "lote", "planificado" y "diferencia" caen siempre en la misma columna.

*Alternativa descartada:* `<div>`s con CSS grid. Más flexible, pero el proyecto no tiene utilidades de grid para esto y habría que inventar estilos nuevos; la tabla reusa lo que ya hay.

### Decision 2 — La selección se traduce a cantidades en 0, sin tocar el backend

Al confirmar, las líneas de las órdenes **no** seleccionadas se mandan en `cantidades` con `cantidad: 0`. El backend ya interpreta 0 como "excluir la línea" y ya descarta el grupo que queda sin líneas (`calcular_ordenes`, Decision 7 del change anterior).

*Por qué:* la semántica que hace falta ya existe y está cubierta por tests. Agregar un parámetro de selección al endpoint duplicaría el mismo concepto con dos formas de expresarlo.

*Consecuencia a cuidar:* el preview de recálculo **no** debe mandar esos ceros, o las órdenes deseleccionadas desaparecerían de la respuesta y con ellas sus insumos. Los ceros de selección se aplican **solo** en la llamada a `/generar`. El preview sigue mandando únicamente las cantidades editadas.

*Alternativa descartada:* filtrar en el cliente y mandar solo las líneas seleccionadas. El backend re-deriva desde Programación, así que omitir una línea no la excluye: la tomaría con su cantidad programada.

### Decision 3 — Estado de selección y de expansión por clave de orden, separados

Dos `Set` de `ordenKey` (`${producto_base_id}|${responsable}`), uno de deseleccionadas y otro de expandidas.

Se guardan las **deseleccionadas** y no las seleccionadas para que el valor por defecto (todas marcadas) sea el conjunto vacío: así una orden que aparezca en un recálculo entra seleccionada sin lógica extra.

*Por qué separados:* expandir y seleccionar son independientes; el spec pide explícitamente que expandir no altere la selección.

### Decision 4 — La validación solo bloquea si la orden está seleccionada

Una cantidad inválida en una orden deseleccionada no impide confirmar, porque esa orden no se va a crear. La marca de error sigue visible en la fila.

*Por qué:* si no, una fila rota de una orden que el usuario ya descartó bloquearía todo el trabajo sin una forma obvia de destrabarlo.

### Decision 5 — La impresión es un componente aparte, hermano de la oblea

Nuevo `OrdenPrint.jsx` junto a `OblejaPrint.jsx`, cada uno con su propio `useReactToPrint` y su `contentRef`. En el detalle quedan dos botones separados.

*Por qué:* son dos documentos con formato distinto (hoja A4 vs. etiqueta de 10×10 cm) y audiencias distintas. Compartir un componente obligaría a parametrizar `@page`, el layout y el contenido; separados, cada uno es directo y la oblea no se toca.

*Alternativa descartada:* reusar `PrintableReport.jsx`. Está armado alrededor de una sola tabla de datos con encabezado y pie fijos (incluido un "Confidential" y un "Page 1" en inglés); la orden necesita tres o cuatro bloques distintos. Se sigue su patrón, no su código.

*Nota:* el bloque imprimible se renderiza en la página pero acotado, igual que hace la oblea, y los botones van marcados `.no-print`.

### Decision 6 — Lo fabricado se trae con un filtro nuevo por orden

Se agrega `orden_id` a `GET /costos/productos_fabricados`, y el detalle lo pide **solo** cuando la orden está en `FINALIZADA`.

*Por qué:* es el cambio más chico que resuelve el caso y sirve para cualquier otra vista que quiera lo fabricado de una orden.

*Alternativa descartada:* incluir `fabricados` en `OrdenProduccionRead`. Cargaría el registro de fabricación en todas las lecturas de orden, incluida la del listado, para algo que solo hace falta al imprimir una orden cerrada.

## Risks / Trade-offs

- **La lista pierde el detalle de insumos "de un vistazo" que hoy está siempre a la vista** → Es el intercambio buscado: con muchas órdenes ese detalle era ruido. Se mitiga con el desplegable, que permite abrir varias a la vez.
- **Los ceros de selección y los ceros de edición son el mismo mecanismo en el backend** → Si algún día hiciera falta distinguirlos (por ejemplo, para auditar por qué una orden no se generó), habría que separarlos. Hoy el resultado es idéntico y no hay registro de ninguno de los dos, así que no agrega ambigüedad observable.
- **Una orden deseleccionada sigue pidiendo recálculo de insumos al editar** → Trabajo de más sin efecto visible si está colapsada. Es despreciable frente a la complejidad de suprimirlo, y mantiene el estado correcto si el usuario la vuelve a seleccionar.
- **Reescribir el cuerpo de la vista previa toca código verificado hace poco** → Los tres invariantes del Context (estructura estable, cálculo local vs. servidor, efectos sin `setState` síncrono) son fáciles de romper sin que nada falle de forma evidente. El recorrido end-to-end que ya existe cubre esos casos y debe volver a pasar.
- **La impresión completa expone la receta, que la oblea evita a propósito** → Son documentos distintos: la oblea se pega en bandejas y carros a la vista de cualquiera; la orden impresa es para la carpeta de producción. Queda registrado acá para que la diferencia sea deliberada y no un descuido.

## Migration Plan

No hay migración de datos ni de esquema. El único cambio de backend (`orden_id` en `productos_fabricados`) es un parámetro opcional nuevo: no rompe a ningún consumidor actual, así que puede desplegarse antes o después. El frontend solo lo necesita al imprimir una orden finalizada.

*Rollback:* revertir el frontend alcanza; el filtro nuevo del backend es inerte si nadie lo manda.

## Open Questions

- ¿Debería la lista recordar entre visitas qué órdenes quedaron deseleccionadas, o arrancar siempre con todas marcadas? Este change arranca siempre con todas.
- Si mañana hay muchas órdenes, ¿hace falta poder filtrar u ordenar la lista (por ejemplo, mostrar primero las que están por debajo del lote)? Queda fuera de alcance hasta ver el volumen real.
