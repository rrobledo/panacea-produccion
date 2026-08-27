## Context

`panacea-produccion` (este repo) es solo frontend; consume un backend propio (`panacea-produccion-backend`, repo separado, mismo equipo) en `/costos/*`. Hoy:

- **Programación** (`GET /costos/programacion`) es una grilla con columnas *definidas por el backend* (`GET /costos/programacion_columnas`, un árbol de `ColGroupDef` que cambia según Año/Mes/Semana). El frontend nunca interpreta el contenido de las filas — solo las renderiza. No sabemos desde acá si cada fila mapea 1:1 a un `producto_id`, o si la cantidad programada de un producto vive repartida en varias columnas (p. ej. una por día). Esto es una dependencia dura del backend, no algo que este cambio pueda resolver solo en el frontend.
- **Cliente** no es una entidad — en el reporte de Ventas es un string libre (`filters.cliente`).
- No existe **Pedido** en ningún lado del sistema.
- El patrón de UI ya establecido (`productos`, `insumos`, `facturas-gastos`) es: lista con grid + filtros, formulario con `react-hook-form` + `zod`, picker de búsqueda para relaciones (ver `CostosLinesEditor` en productos), y ediciones de detalle "staged" que se persisten junto con el guardado del maestro.

## Goals / Non-Goals

**Goals:**
- Registrar pedidos de clientes con sus líneas de producto.
- Poder responder, por producto y semana: ¿lo programado alcanza para lo pedido?
- Avisar en el momento de cargar un pedido si esa línea ya no entra en lo programado.
- Dar al staff una lista clara de qué productos/clientes están en riesgo, para avisar manualmente.

**Non-Goals (de esta etapa):**
- Envío automático de notificaciones (email/WhatsApp) a clientes.
- Bloquear la carga de pedidos que exceden lo programado.
- Tocar el flujo de Orden de Producción / stock de insumos (cambio separado: `ordenes-produccion-stock`).
- CRM de clientes (historial, segmentación, etc.) — solo lo mínimo para poder contactarlos.

## Decisions

**1. Disponibilidad = programado − Σ pedidos ya cargados (por producto y semana), no un stock físico.**
No estamos comparando contra "lo ya producido", sino contra el compromiso total: cada línea de pedido nueva se resta de lo que queda disponible de la Programación de esa semana para ese producto. Alternativa descartada: comparar pedido vs. programado par a par sin acumular — se descartó porque dos pedidos pequeños pueden agotar igual la capacidad de un producto, y el sistema tiene que verlo acumulado.

**2. El "riesgo" se calcula al leer, no se persiste como estado del pedido.**
La propuesta menciona `en_riesgo` como posible estado, pero conviene tratarlo como un valor *derivado* en el momento de mostrar el pedido o el reporte (recalculado contra la Programación y los demás pedidos vigentes), no un campo que se guarda y puede quedar desactualizado si después se reprograma o se cancela otro pedido. El campo `estado` persistido del pedido queda para el flujo humano: `pendiente` → `confirmado` → `cancelado` (y `entregado` si aplica), y el "riesgo" se muestra como un badge calculado aparte, tanto en el formulario de carga como en el reporte.

**3. La alerta al cargar es no bloqueante (advertencia).**
Se muestra un aviso si la línea excede la disponibilidad calculada, pero el guardado sigue permitido — el negocio puede aceptar el pedido a sabiendas y resolverlo ajustando la Programación después. Bloquear se puede agregar más adelante si en la práctica se necesita.

**4. Nuevo endpoint de agregación, no recálculo en el frontend.**
El cruce "programado vs. pedido por producto y semana" requiere sumar filas de Programación (cuya forma no controla el frontend) contra líneas de Pedidos. Se resuelve con un endpoint nuevo del backend, p. ej. `GET /costos/disponibilidad_programacion?anio=&mes=&semana=`, que devuelve por producto: `programado`, `pedido`, `disponible`. Tanto el reporte como la alerta de carga consultan esta misma fuente (la alerta la llama acotada a un producto/semana puntual). Evita duplicar en el frontend una lógica de agregación que depende de cómo el backend arma la grilla de Programación.

**5. Cliente es un maestro mínimo.**
Solo `nombre` + `contacto` (texto libre: teléfono o email), siguiendo el patrón CRUD más simple ya usado en `insumos` (lista + form, sin sub-recursos). Se amplía después si hace falta.

## Risks / Trade-offs

- **[Riesgo] No hay certeza de que cada fila de Programación corresponda a un único producto identificable.** → Mitigación: antes de implementar el endpoint de disponibilidad, confirmar con quien mantiene el backend la forma real de una fila de `/costos/programacion` (¿tiene `producto_id`? ¿la cantidad total del producto en la semana está en una sola columna o hay que sumar varias?).
- **[Riesgo] La alerta no bloqueante puede ignorarse en la práctica y perder su propósito.** → Mitigación: el reporte semanal queda como red de seguridad adicional independiente de que se haya ignorado la alerta puntual.
- **[Trade-off] El envío de la notificación queda manual.** Es menos automatización, pero evita meter una integración de mensajería (y guardar datos de contacto sensibles) antes de validar que el cálculo de disponibilidad es confiable.

## Migration Plan

1. Backend: crear `clientes`, `pedidos` (+ líneas), y el endpoint `disponibilidad_programacion`.
2. Frontend: `clientes` (CRUD simple) primero, porque `pedidos` depende de poder elegir un cliente.
3. Frontend: `pedidos` (CRUD + alerta de disponibilidad en el formulario de línea).
4. Frontend: reporte "Disponibilidad de Programación" en `reportes-costos`.
5. Sin migración de datos existentes — todo es capacidad nueva, no hay tabla previa que tocar.

## Open Questions

- ¿Cómo identifica hoy una fila de `/costos/programacion` a qué producto corresponde? (bloqueante para diseñar el endpoint de disponibilidad — ver riesgo arriba).
- ¿La "semana" de un pedido es la semana de `fecha_entrega`, o el cliente puede pedir para una fecha puntual dentro de la semana y hay que prorratear contra los días programados? Por ahora se asume granularidad semanal, igual que Programación.
