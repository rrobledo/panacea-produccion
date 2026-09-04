## Why

Hoy la única vista de las Órdenes de Producción es una grilla plana ordenada por fecha, con filtros de fecha exacta y estado. Sirve para buscar una orden puntual, pero no para la pregunta que se hace todos los días en planta: **qué hay que producir esta semana, qué día, y cómo viene cada cosa**. Para armar esa foto hoy hay que filtrar día por día y recordar lo que se vio en cada paso.

## What Changes

- **Nuevo reporte "Semana de Producción"**, en el menú **Producción**, junto a "Órdenes de Producción" y "Producto Fabricado".
- **Un tablero con una columna por día.** Lunes a sábado —la semana de negocio del proyecto, igual que la Programación, que excluye solo el domingo— y una séptima columna de domingo **únicamente cuando ese domingo tiene órdenes**, para que ninguna orden quede escondida.
- **Una tarjeta por orden** dentro de su día, mostrando el Código, el Estado con su badge de color, el Responsable/Área y los productos que rinde.
- **Click en la tarjeta abre el detalle** de esa Orden de Producción, la pantalla que ya existe.
- **Navegación entre semanas**: anterior, siguiente y volver a la semana actual. Arranca en la semana en curso y la semana elegida viaja en la URL, para que sobreviva a un refresh y el enlace se pueda compartir.
- Cada día muestra cuántas órdenes tiene, y los días sin órdenes se ven vacíos en vez de desaparecer, para que la semana se lea completa de un vistazo.

## Capabilities

### New Capabilities

Ninguna. El reporte es una vista nueva sobre una capacidad que ya existe.

### Modified Capabilities

> Nota de dependencia: `ordenes-produccion` todavía no está en `openspec/specs/`. La introduce `ordenes-produccion-stock` y la extienden `preview-generacion-ordenes` y `preview-lista-e-impresion-orden`, **ninguno archivado**. Este change se apoya en esa base; conviene archivar los tres, en ese orden, antes que a este.

- `ordenes-produccion`: se agrega la vista semanal por día, con navegación entre semanas y acceso al detalle desde cada tarjeta. No cambia ningún requisito existente: la grilla de Órdenes de Producción sigue igual y esto convive con ella.

## Impact

- **Backend**: ninguno. `GET /costos/ordenes-produccion` ya acepta `fecha_desde` y `fecha_hasta`, que es exactamente lo que el tablero necesita; la respuesta ya trae `codigo`, `fecha_fabricacion`, `responsable`, `estado` y los productos.
- **Frontend** (este repo):
  - Nueva página en `src/pages/ordenes-produccion/`, con su ruta.
  - `src/components/layout/AppLayout.jsx`: entrada nueva en la sección Producción.
  - Reusa `ESTADO_BADGE` y `ESTADO_LABELS` de `src/pages/ordenes-produccion/constants.js`, para que los colores de estado sean los mismos que en el resto del módulo.

## Fuera de Alcance

- Filtrar el tablero por responsable o por estado.
- Mover órdenes de día arrastrándolas, o cambiarles el estado desde el tablero.
- Imprimir o exportar la semana.
- Mostrar insumos, cantidades o avance de producción en la tarjeta: para eso está el detalle.
