## Context

`ordenes_produccion_service.py` hoy tiene una guarda dura: `validar_fecha_sin_ordenes` corre al principio de `preview_ordenes` y de `generar_ordenes`, y tira 422 si la fecha ya tiene aunque sea una orden. Es lo que produce el mensaje *"Ya existen órdenes de producción generadas para 2026-09-04"*. Detrás de esa guarda, `calcular_ordenes` toma **todas** las filas de Programación de la fecha con `plan > 0` y arma los grupos.

El código de cada orden se arma en `generar_ordenes`:

```python
codigo_prefix = fecha.strftime("%y%m%d")
for idx, preview in enumerate(previews, start=1):
    codigo = f"{codigo_prefix}-{idx:02d}"
```

Ese `enumerate(..., start=1)` es correcto solo porque la guarda garantiza una única generación por fecha. Sacándola, una segunda generación volvería a emitir `-01`. Y **`ordenes_produccion.codigo` no tiene índice único**: la base aceptaría el duplicado sin protestar.

Sobre borrar:

- `ordenes_produccion_producto_linea` y `ordenes_produccion_insumo_linea` tienen `ON DELETE CASCADE`; **`productos_fabricados` no** (`NO ACTION`), así que borrar una orden finalizada daría un error de clave foránea.
- Los movimientos de stock referencian la orden por `referencia` (el string del código), no por FK: borrar la orden no los toca.
- `get_comprometido_map` suma las líneas de insumo de órdenes en `ASIGNADA` — **no** el ledger de `RESERVA`. Así que borrar una orden ya libera el comprometido por sí solo, sin tocar movimientos.

## Goals / Non-Goals

**Goals:**

- Poder borrar una orden que nunca llegó a producirse, sin dejar basura en el historial de stock.
- Poder completar un día ya generado, generando solo lo que falta.
- Que una orden cancelada no bloquee volver a generar sus productos.
- Que dos generaciones del mismo día no puedan producir códigos repetidos.

**Non-Goals:**

- Borrar órdenes que ya consumieron insumos o registraron producción.
- Reconciliar una orden existente contra un cambio de cantidad en la Programación.
- Borrado masivo o deshacer.

## Decisions

### Decision 1 — "Pendiente" se decide por `producto_id`, no por fila de Programación

Un producto está pendiente para una fecha si **ninguna** orden de esa fecha en `ASIGNADA`, `EN_PRODUCCION` o `FINALIZADA` lo tiene entre sus líneas. `CANCELADA` no cubre.

*Por qué por producto y no por `programacion_id`:* `OrdenProduccionProductoLinea` guarda `producto_id` y `cantidad_planeada`, no la fila de Programación de la que salió. Emparejar por fila exigiría agregar esa columna y una migración de datos para las órdenes ya existentes, que no tienen forma de reconstruirla.

*Consecuencia aceptada:* si un mismo producto tiene dos filas de Programación en la misma fecha y solo una se generó, el producto entero cuenta como cubierto y la segunda fila no aparece como pendiente. Es un caso de borde poco frecuente, y la alternativa cuesta una migración con datos irrecuperables. Queda anotado en Risks.

### Decision 2 — La cobertura se calcula dentro de `calcular_ordenes`, no antes

`calcular_ordenes` consulta las órdenes existentes de la fecha, arma el conjunto de `producto_id` cubiertos, y descarta esas filas de Programación antes de agrupar. `validar_fecha_sin_ordenes` deja de llamarse desde el preview y la generación.

*Por qué adentro:* es la única implementación del cálculo, y preview y generación ya coinciden por construcción (design de `preview-generacion-ordenes`, Decision 2). Filtrar afuera obligaría a hacerlo dos veces y a mantenerlas sincronizadas.

*Nota:* la función se conserva aunque quede sin usar en esos dos caminos solo si algún otro la necesita; si no, se elimina para no dejar código muerto.

### Decision 3 — El código continúa desde el máximo del día, y se vuelve único

El siguiente número sale de mirar los códigos ya emitidos para esa fecha, tomar el mayor sufijo y seguir desde ahí. Se cuentan **todas** las órdenes de la fecha, incluidas las canceladas: un código no se reutiliza aunque su orden ya no sirva.

Y se agrega una migración con índice único sobre `ordenes_produccion.codigo`.

*Por qué el índice además del cálculo:* el cálculo puede fallar por una carrera entre dos generaciones simultáneas, o por un bug futuro. Sin el índice, el resultado es un duplicado silencioso que aparece semanas después como una confusión en planta; con él, es un error inmediato y visible. Hoy no hay duplicados en la base, así que se crea sin limpieza previa.

*Cuidado con parsear el sufijo:* un código con formato inesperado no debe romper la generación. Los que no matcheen `AAMMDD-NN` se ignoran al calcular el máximo.

### Decision 4 — Borrar es un borrado real, restringido por estado

`DELETE /costos/ordenes-produccion/{id}`, permitido solo en `ASIGNADA` y `CANCELADA`, y rechazado con 422 en los otros dos.

*Por qué no un borrado lógico:* ya existe `CANCELADA` para "esto no se va a hacer y quede constancia". Un tercer estado de "borrada" sería lo mismo con otro nombre y ensuciaría todas las consultas. Lo que falta es sacar el documento de encima, y para eso el borrado real es lo correcto.

*Por qué la restricción es dura y no una advertencia:* `productos_fabricados` sin cascade convertiría un borrado de orden finalizada en un error de base opaco, y un borrado de una en producción dejaría un `CONSUMO` sin orden que lo explique. Ninguno de los dos es recuperable desde la UI.

### Decision 5 — Las reservas se borran por código, no por FK

Los `RESERVA` de la orden se eliminan con `DELETE ... WHERE tipo='RESERVA' AND referencia = <codigo>`, dentro de la misma transacción que borra la orden.

*Por qué es seguro:* solo se borran órdenes que nunca pasaron a producción, así que la orden nunca tiene `CONSUMO` — no hay riesgo de borrar un movimiento que sí afectó stock físico. Y el índice único sobre `codigo` (Decision 3) garantiza que la referencia identifique una sola orden; sin él, un código duplicado haría que este borrado se llevara puestas las reservas de otra orden. **Las dos decisiones dependen entre sí y hay que implementarlas juntas.**

### Decision 6 — El frontend deja de tratar el 422 de fecha ya generada

Se quita ese manejo especial de `GenerarOrdenesPreviewPage.jsx` y en su lugar el preview informa cuántas órdenes ya existen para la fecha, y distingue "no hay nada programado" de "ya está todo generado", que hoy se verían igual.

*Por qué distinguirlos:* son dos situaciones opuestas — una es que falta cargar la Programación, la otra es que el trabajo ya está hecho — y mostrar la misma pantalla vacía para ambas manda al usuario a buscar un problema que no existe.

## Risks / Trade-offs

- **Un producto con dos filas de Programación el mismo día queda cubierto por completo al generar una sola** → Consecuencia directa de Decision 1. Poco frecuente, y la alternativa (guardar `programacion_id` en la línea) exige una migración que no puede reconstruir el dato para las órdenes ya existentes. Si aparece en la práctica, se replantea.
- **Borrar es irreversible y no hay papelera** → Mitigado con la confirmación que nombra la orden, y con la restricción de estados: lo único borrable es un documento que no movió stock físico ni registró producción. El costo real de un borrado equivocado es volver a generarlo.
- **Se pierde el rastro de que una reserva existió** → Es lo decidido. El ledger conserva `CONSUMO` y `AJUSTE`, que son los que mueven stock real; una `RESERVA` de una orden borrada no informa nada útil y ensucia el historial del insumo.
- **Crear el índice único podría fallar si producción tiene duplicados** → No debería haberlos: hasta ahora la guarda impedía generar dos veces la misma fecha. Aun así, la migración conviene correrla verificando antes, y el `tasks.md` lo incluye como paso previo.
- **Quitar la guarda cambia el significado de "generar" para el usuario** → Antes era "generar el día"; ahora es "generar lo que falta del día". Es lo pedido, y el preview lo hace explícito diciendo cuántas órdenes ya existen.

## Migration Plan

1. **Verificar** que no haya códigos duplicados en producción antes de migrar.
2. **Migración** `00NN_ordenes_produccion_codigo_unico.sql`: índice único sobre `ordenes_produccion.codigo`.
3. **Backend**: el endpoint de borrado, la numeración continua y el cálculo de pendientes. El orden importa poco entre sí, pero la numeración continua y el índice único van juntos (Decision 5).
4. **Frontend**: el botón de borrar y los avisos del preview.

Desplegar backend antes que frontend: el frontend nuevo depende del endpoint de borrado, y el backend nuevo no rompe al frontend viejo — que simplemente nunca pedirá borrar y dejará de recibir el 422 que ya manejaba.

*Rollback:* revertir el frontend deja el sistema utilizable. Revertir el backend después de haber generado dos veces la misma fecha es seguro: las órdenes creadas quedan y siguen siendo válidas.

## Open Questions

- ¿Debería el listado de Órdenes de Producción ofrecer también el borrado, o alcanza con el detalle? Este change lo pone solo en el detalle, donde el usuario ya está viendo lo que va a borrar.
- Cuando una fecha queda parcialmente generada, ¿convendría mostrar en el preview cuáles productos ya están cubiertos y por qué orden, además de los pendientes? Sería útil para entender el estado del día, pero agrega ruido a una pantalla cuyo foco es lo que falta. Fuera de alcance por ahora.
