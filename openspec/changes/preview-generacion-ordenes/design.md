## Context

`OrdenesProduccionPage.jsx` hace `POST /costos/ordenes-produccion/generar { fecha }` con la fecha de mañana y muestra un toast con el resultado. Del lado del backend, `ordenes_produccion_service.generar_ordenes(session, fecha)` hace todo en una sola función: lee `Programacion` (filas con `plan > 0` para esa fecha), agrupa por `(producto_base_id or producto_id, responsable)`, suma `fila.plan` por grupo, escala la receta (`Costos`) por `cantidad_total / lote_produccion`, suma los insumos propios de cada producto final, y persiste orden + líneas + reservas de stock, todo antes de devolver nada.

Tres restricciones marcan el diseño:

1. **El cálculo no es trivial ni está expuesto.** La agrupación por producto base, el escalado de la receta base y la suma de insumos propios adicionales viven solo en esa función. No hay endpoint que devuelva los `Costos` de un producto, así que el frontend no puede reproducir el cálculo.
2. **Las cantidades de producto ya son enteras.** `Programacion.plan` y `OrdenProduccionProductoLinea.cantidad_planeada` son `Integer`. Los decimales que se ven en la orden son solo los de `OrdenProduccionInsumoLinea.cantidad` (`Float`).
3. **Los insumos se miden en `ML`, `GR`, `UN`, `KG`, `LT`.** Redondear a 0 decimales no es inocuo en `KG`/`LT`: un requerimiento de `0.4 KG` redondea a 0, y el generador ya descarta las líneas con `cantidad <= 0`, así que el insumo desaparecería de la orden y no se reservaría ni se consumiría.

## Goals / Non-Goals

**Goals:**

- Que el usuario vea exactamente lo que se va a crear antes de crearlo, y que lo previsualizado sea idéntico a lo generado.
- Hacer visible la brecha entre lo planificado y el lote de producción de la fórmula, con señal clara cuando se está produciendo por debajo del lote.
- Permitir corregir la cantidad antes de confirmar, sin alterar la Programación.
- Que las cantidades de insumo sean enteras tanto en lo mostrado como en lo reservado y consumido.

**Non-Goals:**

- Cambiar el criterio de agrupación de órdenes, ni permitir dividir o fusionar grupos desde la vista previa.
- Editar insumos a mano: siempre se derivan de la receta.
- Ajustar automáticamente la cantidad al lote óptimo.
- Corregir órdenes ya creadas.

## Decisions

### Decision 1 — El preview se calcula en el backend, no en el frontend

Nuevo `POST /costos/ordenes-produccion/preview` que devuelve la misma estructura que se persistiría, sin escribir nada.

*Por qué:* replicar en JS la agrupación por producto base y el escalado de recetas exigiría exponer los `Costos` por producto y mantener dos implementaciones del mismo cálculo en dos repos. Cualquier divergencia haría que el preview mienta, que es exactamente el problema que este change intenta resolver.

*Alternativa descartada:* calcular en el cliente a partir de `/costos/programacion` más un endpoint nuevo de `Costos`. Más llamadas, más superficie y garantía de deriva.

### Decision 2 — Un solo cálculo compartido entre preview y generación

Se extrae de `generar_ordenes` una función pura de cálculo, `calcular_ordenes(session, fecha, overrides) -> list[OrdenPreview]`, que hace la agrupación, el escalado y el redondeo pero **no** toca la sesión para escribir. `generar_ordenes` pasa a ser: `calcular_ordenes(...)` seguido de la persistencia de lo que esa función devolvió; el endpoint de preview es `calcular_ordenes(...)` y nada más.

*Por qué:* es la única forma de garantizar por construcción que preview y orden generada coincidan. Si fueran dos caminos de código, coincidirían solo por disciplina.

*Nota de implementación:* la validación de "ya existen órdenes para esa fecha" queda fuera de `calcular_ordenes` y se aplica en ambos endpoints por separado — el preview la usa para negarse a previsualizar, la generación para negarse a crear.

### Decision 3 — Los overrides se llevan por `programacion_id`, no por `producto_id`

`GenerarOrdenesRequest` y el request del preview aceptan `cantidades: list[{ programacion_id: int, cantidad: int }] | None`.

*Por qué:* dentro de un mismo grupo `(producto_base, responsable)` puede haber más de una fila de `Programacion` para el mismo `producto_id`. El `producto_id` no identifica una línea de forma única; el id de la fila de Programación sí. Cada línea del preview lleva su `programacion_id` para poder devolverlo como override.

*Consecuencia:* el preview debe exponer `programacion_id` y también `cantidad_programada` (el `plan` original), que es contra lo que el frontend marca las líneas que difieren del plan.

### Decision 4 — Redondeo half-up sobre el total por insumo, con piso de 1

Se redondea **una sola vez**, sobre el total acumulado de cada insumo en la orden, nunca sobre cada contribución parcial (redondear parcial por parcial acumularía error en las órdenes que suman receta base más insumos propios de varios productos).

El redondeo es half-up explícito (`Decimal(...).quantize(Decimal('1'), rounding=ROUND_HALF_UP)`), **no** el `round()` de Python, que usa banker's rounding y devolvería `2` para `2.5` pero `2` también para `1.5`.

Y se aplica el piso: si el requerimiento exacto es `> 0` pero redondea a `0`, se guarda `1`.

*Por qué el piso:* sin él, la restricción 3 del Context se vuelve un bug de stock silencioso — el insumo no aparece en la orden, no se reserva y no se consume, y el stock queda sobreestimado. Es preferible reservar de más que perder el insumo del documento de trabajo.

*Alternativa descartada:* `ceil` siempre. Elimina el problema del cero pero sobre-reserva de forma sistemática en todos los insumos, no solo en los chicos.

*Alternativa descartada:* redondear solo los insumos en `UN` y dejar `KG`/`GR`/`ML`/`LT` con decimales. Más correcto en teoría, pero contradice lo pedido y deja la pantalla inconsistente.

### Decision 5 — Feedback instantáneo local, insumos recalculados en el servidor

Al editar una cantidad, el frontend recalcula **en el acto y localmente** el total del grupo, la diferencia contra el lote y la marca roja — es aritmética entera sobre datos que ya tiene. Los **insumos** se refrescan pidiendo el preview de nuevo al servidor con los overrides actuales, con `useDebounce` (ya existe en `src/hooks/index.js`) a 400 ms.

*Por qué:* la parte que el usuario mira mientras tipea (el rojo, la brecha) responde sin latencia, y la parte que no se puede calcular en el cliente sin duplicar lógica (Decision 1) se pide al servidor sin una llamada por tecla.

### Decision 6 — El preview es una página con ruta propia, no un modal

Ruta `/ordenes-produccion/generar`, montada dentro del layout privado como el resto de las páginas.

*Por qué:* la tabla puede tener varias órdenes con varias líneas cada una más su detalle de insumos; no entra cómodo en el `Modal` de `components/ui`. Además una ruta sobrevive a un refresh accidental, y sigue el patrón de páginas del resto de la app (`/ordenes-produccion/:id`, `/productos/create`).

*Cuidado:* la ruta debe declararse **antes** que `/ordenes-produccion/:id` en el `Routes`, o `generar` matchea como `:id`.

### Decision 7 — Cantidad 0 excluye la línea; una orden sin líneas no se crea

Un override en `0` saca esa línea de producto de la orden. Si al aplicar los overrides un grupo queda sin ninguna línea, ese grupo no genera orden. El resto de los grupos se genera normalmente.

*Por qué:* es la forma natural de decir "esto mañana no se hace" desde la pantalla, sin agregar un control de borrado aparte.

### Decision 8 — Las órdenes viejas se redondean solo al mostrarse

`OrdenProduccionInsumoLinea.cantidad` sigue siendo `Float` y no hay migración de datos. Las órdenes creadas antes de este change conservan sus decimales guardados; `OrdenProduccionDetailPage.jsx` y `OblejaPrint.jsx` los redondean al renderizar.

*Por qué:* reescribir cantidades de órdenes históricas cambiaría retroactivamente reservas y consumos ya registrados en el ledger de stock, que es justamente lo que no se debe tocar.

## Risks / Trade-offs

- **El piso de 1 sobre-reserva insumos de bajo consumo** → Es deliberado y acotado: solo afecta insumos cuyo requerimiento real es menor a 0.5 en su unidad. La alternativa (perder la línea) es peor. Queda visible en el preview, así que el usuario ve el `1` antes de confirmar.
- **Redondear al persistir cambia los números de stock respecto de hoy** → Es el cambio de comportamiento declarado como BREAKING en la propuesta. No hay migración; el corte es por fecha de generación. Conviene comunicarlo a quien concilie stock, porque el Comprometido va a moverse.
- **El preview puede quedar desactualizado entre que se abre y se confirma** → Alguien puede editar la Programación o generar las órdenes desde otra sesión en el medio. Mitigación: la generación **no** confía en el preview, re-deriva todo desde `Programacion` y solo aplica los overrides por `programacion_id`; los overrides de filas que ya no existen se ignoran, y las filas nuevas entran con su cantidad programada. La guarda de "ya existen órdenes para esa fecha" sigue corriendo al confirmar, así que el peor caso es un error claro, no una orden duplicada.
- **La orden puede apartarse de la Programación sin dejar rastro** → Fue la decisión explícita (la edición no toca `Programacion.plan`). Mitigación dentro de este change: marcar las líneas divergentes en el preview. Queda como limitación conocida que, una vez creada la orden, la diferencia contra el plan ya no se ve en ningún lado.
- **Refactorizar `generar_ordenes` toca el camino que reserva stock** → Es la función más delicada del módulo. Mitigación: los tests de `tests/unit/test_ordenes_produccion.py` ya cubren la generación y la agrupación por producto base; se extienden antes de refactorizar, y el refactor debe dejarlos verdes sin cambiarlos salvo por el redondeo.

## Migration Plan

No hay migración de datos ni de esquema. El orden de despliegue importa porque el frontend pasa a depender de un endpoint nuevo:

1. Backend primero: `calcular_ordenes` + `POST /preview` + overrides en `/generar` + redondeo. `/generar` sin `cantidades` sigue funcionando igual que hoy salvo por el redondeo, así que el frontend actual no se rompe con el backend nuevo.
2. Frontend después: la página de preview y el redondeo de visualización.

*Rollback:* revertir el frontend alcanza para volver al flujo de un paso; el backend nuevo es compatible con el frontend viejo. Lo único no reversible por deploy son las cantidades ya redondeadas de las órdenes creadas mientras tanto.

## Open Questions

- Si un grupo queda por debajo del lote óptimo, ¿debería el sistema ofrecer un atajo para llevarlo al lote (un botón "completar al lote") o alcanza con señalarlo? Este change solo señala; el atajo quedó fuera de alcance a la espera de ver cómo se usa.
- ¿Hace falta dejar registrado en la orden que su cantidad se editó respecto de la Programación (un campo o una nota)? Hoy la divergencia se ve solo en el preview y se pierde al confirmar.
