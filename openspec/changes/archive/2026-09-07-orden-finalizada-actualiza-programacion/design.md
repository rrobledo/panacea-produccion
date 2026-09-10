## Context

`costos_programacion` tiene una fila por `(producto_id, fecha)` con dos números: `plan` (columna **P** del grid) y `prod` (columna **E**). El grid de Programación las pivotea a `YYYYMMDD-P` / `YYYYMMDD-E` (`programacion_service.get_programacion`), las dos editables, y `update_programacion` las escribe de vuelta buscando la fila por `(producto_id, fecha)` con `scalar_one_or_none`.

`plan` es el insumo de la generación de órdenes: `calcular_ordenes` toma las filas de la fecha con `plan > 0` y arma los grupos. `prod`, en cambio, **no lo escribe nadie más que el usuario a mano**, aunque el dato real ya existe: `finalizar_orden` inserta un `ProductoFabricado` por línea con `cantidad_fabricada`, `cantidad_desperdicio` y ubicaciones, y pasa la orden a `FINALIZADA`. Los dos datos viven a un `producto_id` de distancia y nada los une.

Tres detalles del modelo condicionan el diseño:

- **`ProductoFabricado.fecha` es el instante de la finalización (`datetime.now`), no la fecha de fabricación de la orden.** Una orden del viernes se puede cerrar el sábado. La fecha que le corresponde a la Programación es `OrdenProduccion.fecha_fabricacion`.
- **`costos_programacion.prod` es `INTEGER`; `productos_fabricados.cantidad_fabricada` es `FLOAT`.** Hay que redondear.
- **`prod` se suma en los reportes.** `analytics_service` hace `sum(cp.prod)` para el reporte de Producción y su `porcentaje_ejecutado`, y lo usa como multiplicador para estimar insumo consumido (`cc.cantidad / p.lote_produccion * d.prod`). No es un número decorativo: escribirlo mal desplaza reportes de costos.

Y un detalle del lado de las órdenes: una orden **puede tener dos líneas del mismo `producto_id`** (un mismo producto con dos filas de Programación en el mismo grupo — ver `preview-generacion-ordenes` design, Decision 3), y `FinalizarOrdenSection` arma una línea de formulario por línea de orden. El payload de finalización, entonces, puede traer el mismo producto más de una vez.

## Goals / Non-Goals

**Goals:**

- Que la columna E de la Programación quede con la cantidad realmente fabricada, sin que nadie la transcriba.
- Que el número sea reproducible: calcularlo dos veces da lo mismo.
- Que la sincronización no pueda dejar la Programación y `productos_fabricados` en desacuerdo.
- Que un problema de la Programación (una fila que no existe) no impida cerrar una orden.

**Non-Goals:**

- Backfill de las órdenes ya finalizadas.
- Deshacer la finalización, y con ella el ejecutado.
- Escribir E desde otro origen (ajustes de stock de producto terminado, importaciones).
- Cambiar `prod` a decimal, o crear la fila de Programación cuando falta.
- Emparejar la línea de orden con la fila exacta de Programación de la que salió.

## Decisions

### Decision 1 — El ejecutado se **recalcula** desde `productos_fabricados`, no se incrementa con el payload

Al finalizar, para cada `producto_id` de la orden se calcula

```
E(producto, fecha) = Σ cantidad_fabricada
                     de productos_fabricados
                     join ordenes_produccion on orden_id
                     where producto_id = <producto>
                       and ordenes_produccion.fecha_fabricacion = <fecha>
                       and ordenes_produccion.estado = 'FINALIZADA'
```

y se asigna a `prod` (no se suma).

*Por qué recalcular y no `prod += cantidad_fabricada`:* el incremento no es idempotente. Cualquier reintento, un futuro "recalcular esta fecha", o un bug que llame dos veces a la sincronización, duplica el número — y el número alimenta `sum(prod)` de los reportes de producción y de costo de insumo, donde un duplicado no se nota hasta que alguien audita el mes. El recálculo, en cambio, es una función del estado de la base: correrlo N veces da el mismo resultado.

*Consecuencia buscada:* un valor cargado a mano en E queda reemplazado por el real. Eso es lo pedido — la finalización es la fuente de verdad de lo producido.

*Por qué desde la tabla y no desde `payload.lineas`:* el payload puede traer el mismo producto dos veces (una orden con dos líneas del mismo producto), y en el futuro puede haber más de una orden finalizada del mismo producto y fecha. Sumar desde la tabla cubre los dos casos sin lógica extra, y hace que la fórmula sea la misma que usaría un recálculo posterior.

*Alternativa descartada:* un trigger en la base sobre `productos_fabricados`. Escondería la regla lejos del servicio que la explica, y `fecha_fabricacion` vive en otra tabla, así que el trigger necesitaría el join igual. No gana nada y se pierde trazabilidad.

### Decision 2 — La fecha es `orden.fecha_fabricacion`, no `ProductoFabricado.fecha`

El ejecutado se imputa al día que la orden dice que se fabrica, no al momento en que alguien apretó "Finalizar".

*Por qué:* `ProductoFabricado.fecha` es un timestamp de registro. Una orden del viernes cerrada el sábado a la mañana escribiría el ejecutado del sábado, contra un plan que estaba en el viernes: la Programación mostraría el viernes incumplido y el sábado con producción no planificada. El día de fabricación es el que el usuario planificó y el que la orden lleva encima.

### Decision 3 — El desperdicio no entra en E

`E = Σ cantidad_fabricada`. `cantidad_desperdicio` queda solo en `productos_fabricados`.

*Por qué:* E se compara contra P — cuánto de lo planeado se logró. El desperdicio es la contracara (cuánto se perdió), ya tiene su propio registro con ubicación y motivo, y su propia lectura en el listado de Producto Fabricado. Sumarlo a E mostraría el plan cumplido con producto que se tiró.

*Consecuencia:* una orden con mucho desperdicio se ve como incumplimiento del plan en la Programación. Es correcto: para planta lo que importa es que faltó producto.

### Decision 4 — Redondeo `ROUND_HALF_UP` a entero, sin cambiar el tipo de columna

El total se redondea con `ROUND_HALF_UP` a `int` antes de asignarlo, igual que hace `_redondear_insumo` para las cantidades de insumo.

*Por qué no pasar `prod` a decimal:* la columna es `INTEGER` desde el origen, la escriben los usuarios como enteros, la suman los reportes y el grid la muestra como entero. Cambiar el tipo obliga a una migración, a revisar `sum(prod)` en `analytics_service` y a decidir cómo se muestra en el grid — todo para un caso (producto terminado con fracciones) que en la práctica no se da: se fabrican piezas.

*Por qué `ROUND_HALF_UP` y no truncar:* truncar sesga el ejecutado siempre a la baja, y ese sesgo se acumula en `porcentaje_ejecutado`.

### Decision 5 — Sincronizar dentro de la transacción de la finalización, después de un `flush`

La sincronización va en `finalizar_orden`, entre el `session.add` de los `ProductoFabricado` (más el cambio de estado) y el `commit`, con un `flush` de por medio para que la consulta de Decision 1 vea las filas nuevas y el estado `FINALIZADA` ya asignado.

*Por qué la misma transacción:* si fueran dos, un fallo en el medio deja `productos_fabricados` diciendo una cosa y la Programación otra, sin nada que lo señale. Y no hay operación de reparación: no existe "resincronizar".

*Por qué después del flush y no antes:* la consulta filtra por `estado = 'FINALIZADA'` y suma los `ProductoFabricado`, todo lo que esta misma operación acaba de escribir. Si esas filas no estuvieran en la base al momento del agregado, la orden que se está cerrando no se contaría y E quedaría en el total de las órdenes anteriores — es decir, en 0 en el caso normal.

*Corrección tras implementarlo:* el autoflush de SQLAlchemy ya manda las pendientes al ejecutar el `SELECT`, así que el orden correcto se da solo y quitar el `flush` explícito no rompe nada (comprobado sacándolo: los 11 tests siguen pasando). El `flush` se deja igual, explícito, para que la dependencia esté a la vista y no dependa de que el autoflush siga activo — pero **no** es el modo de fallar que este design anticipaba.

### Decision 6 — Una fila de Programación que no existe se omite, no falla

Si no hay fila de `costos_programacion` para `(producto_id, fecha_fabricacion)`, la sincronización de ese producto se omite y la finalización sigue.

*Por qué no un 404 como hace `update_programacion`:* son dos operaciones distintas. En `update_programacion` el usuario está editando una celda que la pantalla le mostró: si no está, hay un desfase real que conviene mostrarle. En la finalización el usuario está registrando lo que pasó en planta; negarle el cierre porque falta una fila de libro mayor lo deja con una orden abierta y ninguna manera de avanzar, y encima habría perdido el registro de lo fabricado.

*Cuándo puede pasar:* una fila de Programación borrada o regenerada después de generar la orden. Es raro, pero el costo de equivocarse en cada dirección no es simétrico.

### Decision 7 — Si hay filas duplicadas para `(producto_id, fecha)`, se escribe una sola

La consulta trae las filas ordenadas por `id` y se escribe la primera; las demás quedan como estén.

*Por qué no escribir todas:* `analytics_service` hace `sum(cp.prod)`. Escribir el mismo total en dos filas duplicadas duplicaría el producido y el consumo estimado de insumo en los reportes. Escribirlo en una sola mantiene la suma correcta.

*Por qué no repartir el total entre las filas:* no hay criterio para repartirlo — la línea de orden guarda `producto_id`, no de qué fila salió.

*Nota:* estas duplicadas no deberían existir. `update_programacion` ya asume unicidad (`scalar_one_or_none`, que con duplicados tira 500), así que si aparecieran ya habría un bug visible antes de este change. Verificarlo es un paso de la implementación; agregar el índice único que lo garantice queda fuera de alcance, anotado en Open Questions.

### Decision 8 — Una sola consulta agregada para todos los productos de la orden

Se resuelven los `producto_id` distintos de la orden y se calculan sus totales con un `GROUP BY producto_id`, y las filas de Programación con un `IN`. No una consulta por producto.

*Por qué:* una orden agrupa varios productos de una misma base, y este servicio ya pagó el precio de las consultas en bucle en otros lugares del repo (los `batched` de `programacion_service` existen justamente por eso). El agregado es una consulta, no N.

### Decision 9 — El frontend no cambia de estructura; sí de mensaje

`ProgramacionPage.jsx` ya lee `prod` en la columna E y la refetchea al aplicar filtros, así que el número nuevo aparece solo. Lo único que se agrega es que el toast de finalización diga que la Programación se actualizó.

*Por qué vale el cambio de copy:* el usuario que hoy transcribe a mano no tiene forma de enterarse de que ya no hace falta. Un toast que solo dice "Orden finalizada" lo deja repitiendo el trabajo.

*Por qué E sigue editable:* el sistema pone el número real, pero puede haber correcciones legítimas (un recuento posterior). Bloquear la celda convertiría un dato corregible en uno inmutable, y no hay pantalla alternativa para corregirlo.

## Risks / Trade-offs

- **Un valor de E cargado a mano se pierde al finalizar la orden** → Es lo decidido explícitamente (Decision 1): lo fabricado manda sobre lo transcripto. El usuario puede volver a editar la celda después, y la Programación queda con el número real en vez de con el que alguien recordaba.
- **Las órdenes ya finalizadas antes de este change quedan sin E** → No hay backfill en el alcance. Se puede correr después la misma agregación de Decision 1 sobre las fechas históricas; queda anotado en Migration Plan como paso operativo opcional, no como código.
- **Redondear a entero pierde fracciones** → Solo afecta a productos que se fabriquen en cantidades fraccionarias, que hoy no existen. `ROUND_HALF_UP` evita el sesgo sistemático a la baja que tendría truncar.
- **Un producto con dos filas de Programación el mismo día recibe el ejecutado en una sola (Decision 7)** → Mismo caso de borde que ya asumió `borrar-orden-y-generar-pendientes` (Decision 1) al calcular cobertura por producto. La alternativa exige guardar `programacion_id` en la línea de orden, con una migración que no puede reconstruir el dato de las órdenes existentes.
- **El desperdicio hace que la Programación muestre incumplimiento** → Buscado (Decision 3). El detalle de por qué faltó producto está en Producto Fabricado, con motivo y ubicación.
- **La sincronización silenciosa de Decision 6 puede ocultar un desfase real** → Mitigado dejando registro en el log del servidor cuando se omite un producto por falta de fila, para que sea diagnosticable sin romperle el cierre al usuario.
- **Un `flush` mal ubicado deja E en 0 sin fallar nada** → Sobreestimado: el autoflush de SQLAlchemy cubre el caso por sí solo (ver la corrección en Decision 5). El test de que el ejecutado incluye la orden que se está cerrando queda igual, porque fija el resultado que importa, pero no es el riesgo que se creía.

## Migration Plan

1. **Verificar** que no haya filas duplicadas de `costos_programacion` por `(producto_id, fecha)`: `select producto_id, fecha, count(*) from costos_programacion group by 1,2 having count(*) > 1`. Si aparecen, resolverlas antes de desplegar (y revisar por qué `update_programacion` no venía fallando).
2. **Backend**: la sincronización en `finalizar_orden`, con sus tests. Sin migración de esquema ni de datos.
3. **Frontend**: el cambio de mensaje al finalizar. Es independiente y puede ir después.

Desplegar backend antes que frontend. El frontend viejo funciona igual contra el backend nuevo — la Programación simplemente empieza a mostrar E lleno.

*Rollback:* revertir el backend deja de escribir E; los valores ya escritos quedan y siguen siendo correctos (son lo que se fabricó). No hay estado intermedio que haya que limpiar.

*Backfill (opcional, fuera del alcance del código):* correr la agregación de Decision 1 agrupada por `(producto_id, fecha_fabricacion)` sobre las órdenes `FINALIZADA` históricas y escribir `prod`. Conviene decidirlo con el usuario: pisaría los valores que se cargaron a mano hasta hoy.

## Open Questions

- ¿Conviene un índice único sobre `costos_programacion (producto_id, fecha)`? Haría imposible el caso de Decision 7 y arreglaría de paso el 500 latente de `update_programacion`. Fuera de alcance acá porque es una migración con posible limpieza de datos previa, y merece su propio change.
- ¿Hay que hacer backfill de las órdenes finalizadas antes de este change, sabiendo que pisaría lo cargado a mano? Se puede decidir después de ver, con el sistema andando, cuántas celdas E cargadas a mano hay realmente.
- ¿Debería el detalle de la orden finalizada mostrar un link a la Programación de su fecha? Ayudaría a cerrar el círculo, pero la Programación se filtra por año/mes/semana y no por fecha puntual, así que el link no puede posicionarse en la celda. Fuera de alcance.
- Si en el futuro se pudiera reabrir o borrar una orden finalizada, ¿E debería recalcularse (y bajar)? Con la fórmula de Decision 1 alcanza con volver a correr la sincronización de esos productos y fechas — el cálculo ya lo contempla, pero el disparador no existe todavía.
