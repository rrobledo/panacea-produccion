## Context

Este repo es solo frontend contra un backend propio (`panacea-produccion-backend`, repo separado, mismo equipo controla ambos). Estado actual relevante:

- **Producto** ya tiene BOM propio (`costos`: insumo + cantidad, editable en staged mode desde `ProductoEditPage`), `lote_produccion` (tamaño de lote), y un toggle **`is_producto` ("Producto Final")** ya presente en `ProductoForm.jsx` que hoy no dispara ningún comportamiento adicional. Ese campo es exactamente la distinción que hace falta entre producto final (medialunas, facturas) y producto intermedio (una masa que se guarda y después se usa para armar otros productos) — no hace falta una entidad nueva para modelar "masa", alcanza con un Producto con `is_producto = false`. No existe hoy ningún vínculo entre un producto final y el producto intermedio del que se arma — se descartó usar el campo `ref_id` existente para esto (confirmado con el usuario: `ref_id` es otra cosa, "ID externo").
- **Insumo** tiene `cantidad` como campo numérico editado a mano en `InsumoForm.jsx` (`type="number"`), sin ningún registro de movimientos. `facturas-gastos` ya registra compras con detalle de insumos (`ctacteprov/{id}/insumos`) pero es puramente contable — no toca `insumos.cantidad`.
- **Programación** (`GET /costos/programacion`) es una grilla cuyas columnas define el backend dinámicamente por Año/Mes/Semana (`programacion_columnas`). El frontend no interpreta su contenido — es una dependencia dura para saber "qué se fabrica el día X" (misma incertidumbre señalada en el cambio `pedidos-vs-programacion`).
- El patrón de UI ya usado para "maestro + líneas staged que se persisten juntas" es el de `productos.costos` y `facturas-gastos` (`Pagos`, `Detalle de Insumos`) — se reutiliza para las líneas de una Orden de Producción.

## Goals / Non-Goals

**Goals:**
- Modelar que varios productos finales pueden compartir un mismo producto intermedio (p. ej. una masa) del que se arman, reutilizando el `is_producto` que ya existe en vez de crear una entidad nueva.
- Generar, el día anterior a la fecha de fabricación programada, un documento (Orden de Producción) que asigna todos los insumos necesarios para el lote — pudiendo cubrir más de un producto final si comparten el mismo producto intermedio.
- Llevar un registro real de stock de insumos con dos momentos de descuento: reserva al generar la orden, consumo real al iniciar producción (retiro físico).
- Reflejar el stock resultante en `insumos.cantidad` de forma consistente (ya no editable a mano sin dejar rastro).
- Registrar, al finalizar una orden, qué producto se fabricó realmente (final o intermedio), cuánto, en qué ubicación (depósito/sector) quedó, y cuánto se desperdició y por qué.
- Mantener un catálogo de ubicaciones (depósitos identificados por sector) para poder decir dónde está el producto terminado, más allá de una sola opción genérica "Depósito".

**Non-Goals (de esta etapa):**
- Generación automática por cron — se dispara manualmente desde la UI ("Generar Órdenes de Mañana").
- Costeo de inventario (FIFO/promedio) — solo cantidades, no valorización de movimientos.
- Tocar el comparativo Pedidos vs. Programación (`pedidos-vs-programacion`, cambio separado).
- Compras que reponen stock de insumos (entradas) — este cambio cubre reserva/consumo hacia producción; el alta de una entrada de stock por compra queda fuera (se podría enganchar después a `facturas-gastos`).
- **Descuento automático de stock de producto terminado/intermedio** (confirmado con el usuario): por ahora solo se registra dónde quedó guardado lo fabricado, sin un ledger de movimientos como el de insumos. Que un producto intermedio se "consuma" al usarse para armar un producto final no se descuenta todavía — es una iteración futura si hace falta.
- Jerarquía Depósito → Sectores: se descartó (confirmado con el usuario) a favor de un catálogo plano de "ubicaciones", cada una ya identificada por nombre (p. ej. "Depósito Central - Estante 3"), sin un depósito padre administrado aparte.
- Desperdicio de insumos (materia prima perdida durante el proceso): el desperdicio de esta etapa se mide solo sobre el producto fabricado, no sobre los insumos consumidos (confirmado con el usuario).

## Decisions

**1. El producto intermedio (masa) es un Producto con `is_producto = false`, no una entidad nueva.**
Se descarta el diseño anterior de una entidad `Masa` separada. En su lugar, `Producto` gana un campo opcional `producto_base_id`, self-referencial, que apunta a *otro* Producto (que debe tener `is_producto = false`). Ese producto intermedio ya tiene su propio BOM (`costos`, insumo + cantidad) igual que cualquier producto — no hace falta un BOM paralelo. Un producto final con `producto_base_id` set reutiliza el BOM del producto base más, opcionalmente, sus propios `costos` para insumos adicionales (relleno, glaseado, etc. — ver el requisito "Producto Costos Optional When Linked to a Producto Base"). Alternativa descartada (la del diseño anterior): entidad `Masa` separada — se descarta porque duplicaba un concepto (BOM + rendimiento) que Producto ya resuelve, y porque el usuario aclaró que en la práctica una masa *es* un producto (intermedio) que además Producción necesita poder registrar como fabricado, igual que un producto final.

**2. Reserva y consumo de insumos son dos movimientos de stock distintos, no dos ediciones directas de `cantidad`.**
`ASIGNADA` → movimiento `RESERVA` (compromete insumo, no cambia el disponible real para otras órdenes — pero sí lo excluye de "disponible para reservar" en órdenes futuras). `EN_PRODUCCION` (retiro físico) → movimiento `CONSUMO` (ahí sí baja `insumos.cantidad`). Esto evita que dos órdenes generadas el mismo día se pisen sobre el mismo insumo sin que el sistema lo note, y separa "insumo comprometido" de "insumo físicamente usado".

**3. `insumos.cantidad` pasa a ser de solo lectura en el formulario de edición; los cambios pasan por movimientos.**
Edición directa de un número no deja rastro de por qué cambió. Se reemplaza por: (a) los movimientos automáticos de Orden de Producción, y (b) una acción explícita "Ajustar Stock" que crea un movimiento `AJUSTE` con motivo. La `cantidad` en la creación de un insumo nuevo se mantiene editable (es el stock inicial/apertura). Esto aplica solo a insumos — el stock de productos fabricados (ver Decisión 5) es un concepto separado y más simple (sin ledger) en esta etapa.

**4. Agrupación por producto base ocurre al generar la orden, leyendo la Programación del día siguiente.**
Se toma la Programación filtrada a la fecha de fabricación, se agrupan los productos programados por (`producto_base_id`, Responsable) — los que no tienen producto base quedan cada uno en su propio grupo — y por grupo se calcula la cantidad total necesaria (a partir de `lote_produccion` × cantidad de lotes programados, o la cantidad programada directamente si ya viene en unidades de producto) y se explota el BOM del producto base (o del producto mismo, si no tiene base) escalado a esa cantidad total.

**5. Registrar producto fabricado es parte de Finalizar, con ubicación de un catálogo abierto y sin descuento automático.**
Al finalizar una orden, por cada producto-línea se pide la Cantidad Fabricada real (puede diferir de la planeada) y una Ubicación elegida de un catálogo de ubicaciones (ver Decisión 9), y se guarda como un Registro de Producto Fabricado — sin crear un movimiento de stock descontable como el de insumos (ver Non-Goals). Esto aplica igual a un producto final que a uno intermedio: registrar que una tanda de masa terminó y quedó en "Cámara - Sector 1" es la misma operación que registrar que se fabricaron 200 medialunas y quedaron en "Depósito Central - Estante 3". Alternativa descartada: pedir esto como paso aparte después de Finalizar — se descartó porque separar los pasos deja una ventana donde la orden ya está "cerrada" sin que quede registro de qué salió de ella.

**5.1. El desperdicio se registra por producto-línea, con motivo obligatorio si la cantidad es mayor a cero, y con su propia ubicación independiente de la del producto terminado.**
Se agrega Cantidad de Desperdicio (opcional, default 0), Ubicación de Desperdicio, y Motivo (texto) a cada línea del formulario de Finalizar — no un flujo separado ni un movimiento de stock de insumos. Motivo y Ubicación de Desperdicio son obligatorios solo si la cantidad de desperdicio es mayor a cero, para no forzar al usuario a completarlos en un 0. La Ubicación de Desperdicio se elige del mismo catálogo de `ubicaciones` que la Ubicación del producto terminado, pero es un campo aparte: lo bueno de la tanda puede ir a Cámara mientras el desperdicio va a un área de descarte/compost distinta — no tienen por qué coincidir (motivo directo de este ajuste, pedido explícitamente por el usuario). Se descartó registrar desperdicio de insumos en esta etapa (confirmado con el usuario): más simple, y el desperdicio de producto ya es la señal operativa que se necesita hoy (cuánto de lo planeado no se pudo vender/usar, y adónde fue a parar).

**6. Orden de Producción como único documento por grupo, con líneas de producto + líneas de insumo.**
Una orden = un producto base (o un producto sin base) + fecha de fabricación. Sus líneas de producto listan qué productos y cuánto de cada uno sale de esa tanda; sus líneas de insumo listan qué se reservó/consumió. Si el mismo día se programan productos con distintos productos base, se generan varias órdenes (una por grupo), no una sola mezclada.

**7. La oblea es una por orden (no una por producto dentro de la orden), y nunca muestra insumos.**
Aunque una orden puede rendir varios productos, se decidió (confirmado con el usuario) imprimir una sola oblea por orden que liste los nombres de todos los productos que rinde, en vez de una oblea separada por producto — más simple de manejar en el piso de producción, a costa de no diferenciar bandejas individuales una vez repartida la masa (si en la práctica hace falta diferenciarlas, es una iteración futura). El "distintivo" impreso combina Código de la orden, Responsable/Área, y nombre(s) de producto — la fecha impresa es la fecha de fabricación (fecha prevista de ejecución), no una fecha de entrega al cliente (la orden no tiene ese dato; eso vive en Pedido, capability separada). Se reutiliza el mismo patrón de impresión ya usado en `reportes-costos` (botón que abre el diálogo de impresión del navegador, acotado a ese contenido) en vez de generar un PDF — evita agregar una librería nueva solo para esto.

**8. Responsable/Área de la orden se hereda de la Programación.**
Programación ya filtra/agrupa por Responsable (Pasteleria, Pastas, Panaderia, Galletas). Al generar una orden desde un grupo de filas de Programación, se asume que todas comparten el mismo Responsable (es el mismo criterio que ya usa Programación para agrupar) y la orden hereda ese valor directamente, sin pedirlo de nuevo.

**9. Ubicaciones son un catálogo plano ("Depósitos por sector"), no una jerarquía Depósito → Sectores.**
Nueva capability `ubicaciones`: CRUD simple (mismo patrón que `insumos`/`clientes` — lista + form, sin sub-recursos) donde cada registro ya es una ubicación identificable por su Nombre completo (p. ej. "Depósito Central - Estante 3", "Cámara - Sector 1"). Se descartó (confirmado con el usuario) modelar Depósito y Sector como dos entidades relacionadas — el catálogo plano alcanza para identificar dónde está el producto terminado sin agregar una jerarquía a mantener. Si en la práctica hace falta agrupar/reportar por depósito padre más adelante, se puede introducir sin romper este modelo (el Nombre ya lo sugiere por convención).

## Risks / Trade-offs

- **[Riesgo] Misma incertidumbre que en `pedidos-vs-programacion`: no está confirmado que una fila de Programación tenga un `producto_id` explícito y una cantidad clara por día.** → Mitigación: resolver esa pregunta con el backend antes de implementar el endpoint de generación de órdenes; es un bloqueante compartido entre ambos cambios, conviene resolverlo una sola vez.
- **[Riesgo] Dos productos con el mismo producto base programados el mismo día podrían, en un caso raro, tener distinto Responsable en Programación.** → Mitigación: si eso pasa, no deberían agruparse en la misma orden pese a compartir base; el endpoint de generación agrupa por (`producto_base_id`, Responsable), no solo por `producto_base_id`.
- **[Riesgo] Reserva sin descuento real puede sobre-comprometer si nadie cancela una orden vieja.** → Mitigación: al cancelar una orden, liberar su `RESERVA` no consumida.
- **[Riesgo] `producto_base_id` self-referencial puede formar ciclos (A basado en B basado en A) o autoreferencia.** → Mitigación: validar en creación/edición de producto que no se seleccione a sí mismo ni genere un ciclo (ver escenario en `productos`).
- **[Trade-off] No cubrir entradas de stock de insumos (compras) en esta etapa** deja `insumos.cantidad` bajando pero sin una vía simple de reponerlo salvo el "Ajustar Stock" manual — aceptable como primer paso, documentado como no-goal explícito.
- **[Trade-off] No descontar stock de producto fabricado al usarse/venderse** significa que las ubicaciones muestran lo que se fabricó, no necesariamente lo que queda físicamente ahora — es una foto de producción, no un inventario en tiempo real. Aceptado explícitamente por el usuario como alcance de esta etapa.
- **[Riesgo] Convertir `insumos.cantidad` en solo-lectura es un cambio disruptivo para quien hoy la edita directamente como flujo normal.** → Mitigación: la acción "Ajustar Stock" cubre el mismo caso de uso (corregir un número) sin perder trazabilidad; comunicar el cambio de flujo al equipo antes de desplegar.
- **[Trade-off] El desperdicio se mide solo por producto, no por insumo** — no se ve, con esto solo, si el desperdicio vino de un insumo específico que falló (ej. un lote de harina en mal estado) versus un error de proceso. Aceptado por el usuario para esta etapa; el Motivo en texto libre da algo de esa señal sin modelar un ledger de desperdicio de insumos.

## Migration Plan

1. Backend: agregar `producto_base_id` (nullable, self-referencial) a `productos`; crear `ubicaciones`, `stock_movimientos`, `ordenes_produccion` (+ líneas de producto y de insumo, Código, Responsable), `productos_fabricados` (registro de lo finalizado: producto, cantidad, ubicacion_id, cantidad_desperdicio, motivo_desperdicio, fecha, orden); endpoint de generación desde Programación; y el cambio de `insumos` (`PUT` deja de aceptar `cantidad`).
2. Dato inicial: sembrar `stock_movimientos` con un `AJUSTE` de apertura igual al `cantidad` actual de cada insumo, para no perder el valor existente al migrar.
3. Frontend: CRUD de `ubicaciones` primero, porque el flujo de Finalizar depende de poder elegir una.
4. Frontend: picker de Producto Base (restringido a `is_producto = false`) en `ProductoForm.jsx`, con validación de ciclos.
5. Frontend: cambio en `InsumoForm.jsx` (cantidad read-only) + acción "Ajustar Stock".
6. Frontend: `ordenes-produccion` (generación, vista, transición de estados, oblea, finalizar con registro de producto fabricado + desperdicio).
7. Frontend: listado "Producto Fabricado" (filtrable por producto/ubicación/fecha).

## Open Questions

- ¿Cómo identifica hoy una fila de `/costos/programacion` a su producto y a la cantidad programada por día? (compartida con `pedidos-vs-programacion`).
- ¿El rendimiento de un producto base es fijo (siempre rinde N unidades por tanda) o variable según el producto final que se arma con él? Se asume fijo por tanda estándar (a partir de `lote_produccion` del producto base); si varía por producto final, el cálculo de la Decisión 4 debe ajustarse.
- ¿Qué pasa con una Orden `ASIGNADA` cuyo día de fabricación pasa sin que nadie la lleve a `EN_PRODUCCION`? Por ahora queda `ASIGNADA` sin vencer automáticamente; a definir si hace falta un estado `VENCIDA`.
- ¿Hace falta, más adelante, descontar el producto intermedio fabricado a medida que se usa para armar productos finales (para saber cuánta masa "sobrante" queda en Cámara)? Marcado explícitamente como no-goal de esta etapa, pero puede volverse necesario si la operación lo pide.
