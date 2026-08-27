## Por qué

Hoy los pedidos de clientes llegan como notas sueltas (fuera del sistema) y la Programación semanal vive aislada en `/costos/programacion`. Nadie compara ambas cosas, así que una semana con demanda comprometida por encima de lo programado se descubre tarde — cuando ya no da tiempo de avisar al cliente o de ajustar la producción. Necesitamos registrar los pedidos en el sistema y comparar, producto por producto y semana por semana, cuánto se prometió contra cuánto se programó fabricar, con una alerta apenas se carga un pedido que no entra en lo programado.

## Qué Cambia

- Nueva entidad **Cliente** (maestro simple: nombre + contacto) — hoy "cliente" es solo un string libre en el reporte de Ventas, no hay dónde guardar un dato de contacto.
- Nueva entidad **Pedido**: cliente, fecha de pedido, fecha de entrega solicitada, estado (`pendiente` / `confirmado` / `en_riesgo` / `cancelado`), y líneas de producto + cantidad.
- Cálculo de **disponibilidad** por producto y semana: `programado(producto, semana) − Σ cantidad ya pedida para esa semana`. Se usa en dos lugares:
  - **Alerta al cargar un pedido**: si una línea de pedido excede la disponibilidad calculada, se muestra una advertencia antes de guardar (no bloquea el guardado — el negocio puede decidir aceptarlo igual).
  - **Reporte "Disponibilidad de Programación"**: vista semanal, por producto, con columnas Programado / Pedido / Disponible / Estado, para detectar de un vistazo qué productos están en riesgo y a qué clientes hay que avisar.
- El envío del aviso al cliente queda **manual** en esta primera etapa (el staff lo hace por fuera del sistema, usando el reporte como lista de qué avisar); no se integra un canal de notificación automática todavía.

## Capacidades

### Capacidades Nuevas
- `clientes`: CRUD simple de clientes (nombre, contacto) para poder asociarlos a pedidos.
- `pedidos`: CRUD de pedidos con líneas de producto, cálculo de disponibilidad contra Programación, y alerta al cargar una línea que excede lo programado.

### Capacidades Modificadas
- `reportes-costos`: agrega un nuevo reporte de solo lectura, "Disponibilidad de Programación", que compara pedidos vs. programado por producto y semana.

## Impacto

- **Backend** (repo separado, controlado por el equipo): nuevas tablas/endpoints `clientes`, `pedidos` (+ líneas), y un endpoint de disponibilidad agregada por producto/semana que cruza `pedidos` con `programacion`.
- **Frontend**: nuevas páginas `src/pages/clientes` y `src/pages/pedidos` (siguiendo el patrón CRUD ya usado en `insumos`/`productos`), nueva vista de reporte en `src/pages/reportes`, entrada de menú/navegación nueva, y la alerta de disponibilidad integrada al formulario de carga de línea de pedido.
- No afecta la Programación existente (`planning-programacion`) — solo la lee.

## Fuera de Alcance (para una etapa siguiente)

- Envío automático de notificaciones a clientes (email/WhatsApp).
- Bloquear la carga de un pedido que excede lo programado (por ahora solo advierte).
- El flujo de Orden de Producción y descuento de stock de insumos — es un cambio aparte (`ordenes-produccion-stock`), del lado de la oferta, con su propio modelo de datos (producto intermedio/`producto_base_id`, movimientos de stock).
