## Why

La panadería no fabrica productos de a uno: amasa una vez y de esa masa saca varios productos con distinto gramaje. El modelo actual intuye eso —`is_producto` marca el intermedio, `producto_base_id` dice de qué masa sale cada producto, y las órdenes ya se agrupan por `(producto_base_id, responsable)`— pero le falta el número: **`producto_base_id` dice de qué masa sale un producto, nunca cuánta masa consume**. Como consecuencia, la explosión de receta suma unidades de productos heterogéneos (`total = Σ cantidad` en `GenerarOrdenesPreviewPage.jsx:173`) y divide ese total por el `lote_produccion` del producto base: sumar 100 panes de 360 g con 100 de 110 g y llamar "200" a ese total sólo es correcto si todos pesan lo mismo.

A eso se suma que el sistema no sabe que existen las máquinas. Dos órdenes válidas por separado pueden pedir la misma amasadora a la misma hora, y nadie se entera hasta que pasa en la planta.

## What Changes

- **El vínculo producto→masa pasa a ser un grafo de procesos.** Tres primitivas nuevas: `articulo` (con `naturaleza`: INSUMO / SEMIELABORADO / TERMINADO / RESIDUO), `proceso` (ELABORACION / DIVISION / TRANSFORMACION / FRACCIONAMIENTO) y `proceso_linea` (con `rol`, `gramaje_g`, `merma_pct`, `rendimiento_pct`, `minutos_directos`). La salida de un proceso puede ser la entrada de otro, sin límite de profundidad.
- **BREAKING** — la explosión de receta pasa a `Σ(cantidad × gramaje)` en lugar de `Σ cantidad`. Las cantidades de insumo reservadas cambian para toda masa compartida por productos de distinto gramaje.
- **BREAKING** — una línea de receta puede apuntar a un **artículo**, no sólo a un insumo. Habilita el multinivel real: el disco de brownie es salida de un proceso y entrada de otro.
- **BREAKING** — `is_producto` (booleano excluyente) se reemplaza por `naturaleza` + `vendible`, para que un artículo pueda venderse *y* ser componente de otro.
- Los productos ganan `unidad_base` con **KG** (hoy sólo hay `GR` y `UN`) y `peso_unitario_g`, la bisagra que traduce kilos de masa en cantidad de bollos.
- **Los semielaborados llevan stock propio**: el ledger de movimientos se extiende de insumos a artículos producidos. La masa sobrante de un redondeo a lote queda con saldo y la orden del día siguiente la consume antes de volver a amasar.
- Las recetas se **versionan** (`vigente_desde`) y cada orden congela con qué versión se emitió, para que cambiar una receta deje de reescribir el costo histórico en silencio.
- **Maquinaria, hasta el nivel de detección**: catálogo de máquinas con capacidad y unidad de capacidad, etapas por proceso que apuntan a un *tipo* de máquina con capacidad mínima, cálculo de bachas, y un tablero de carga del día que avisa cuando el turno no entra. No asigna horarios.
- **La merma se declara y se mide**: un porcentaje esperado en la línea de proceso dimensiona la producción, y el `cantidad_desperdicio` que ya se registra al finalizar se compara contra él.
- El costeo pasa a dos capas: costo del semielaborado por kilo, más el tiempo y el horno propios de cada rama. El costo conjunto de un fraccionamiento (brownie → cuadrados + discos + recorte) se reparte **por peso**, absorbiendo el residuo sin valor entre las salidas buenas.
- Las cantidades de insumo dejan de redondearse a entero con piso de 1; el redondeo pasa a ser sensible a la unidad. **La Programación sigue trabajando en enteros**: un producto en KG se programa en kilos enteros.
- `responsable` pasa de enum a **centro de trabajo** con tarifa horaria y capacidad de turno, en la fase de costeo.

## Capabilities

### New Capabilities
- `procesos`: el grafo artículo → proceso → artículo. Naturaleza y unidad base del artículo, tipos de proceso, líneas con rol/gramaje/merma/rendimiento/tiempo, versionado de recetas, lote mínimo y múltiplo, y la explosión inversa que traduce demanda de producto terminado en kilos de masa.
- `maquinaria`: catálogo de máquinas con capacidad y unidad de capacidad, etapas de proceso por tipo de máquina, cálculo de bachas, ocupación exclusiva vs. concurrente, y tablero de carga del día con detección de sobrecapacidad.

### Modified Capabilities
- `productos`: `naturaleza` y `vendible` reemplazan a `is_producto`; `unidad_base` admite KG y agrega `peso_unitario_g`; `lote_produccion` y `tiempo_produccion` se mudan al proceso. `ref_id`, `prioridad` y `utilidad` **se conservan**: no los usa el frontend, pero sí el backend — `prioridad` ordena la lista de productos y las filas de la grilla de Programación, `utilidad` alimenta el `precio_sugerido` del reporte de costos, y `ref_id` se agrupa en las consultas de `analytics_service`.
- `stock`: el ledger deja de ser sólo de insumos y pasa a cubrir artículos producidos (semielaborados y terminados), con movimientos de PRODUCCION y CONSUMO_INTERNO además de los actuales.
- `ordenes-produccion`: la orden se emite contra un proceso y una versión de receta, se imprime en tres bloques (fórmula de la masa, partición por gramaje, recorrido de máquinas), y sus líneas de producto guardan `programacion_id`, `masa_kg`, `bollos` y `gramaje_g`.
- `insumos`: el redondeo de cantidades pasa a ser sensible a la unidad de medida y se elimina el piso de 1 que sobre-reserva sistemáticamente los insumos en KG y LT.
- `planning-programacion`: índice único por `(producto_id, fecha)` —hoy hay filas duplicadas en producción— y la grilla muestra la unidad base del producto para que un producto en KG se programe en kilos enteros.
- `reportes-costos`: `costo_unitario_mp` pasa a incluir el costo del semielaborado en vez de aplanar todo a insumos; se agrega costo de mano de obra por centro de trabajo y máquina; se retira el par duplicado `costo_*` / `costo_*_new` de `/costos/precio_productos`.

## Impact

- **Backend** (repo separado): tablas nuevas `proceso`, `proceso_linea`, `proceso_operacion`, `maquina`, `orden_operacion`, `centro_trabajo`; extensión de `costos_productos` (naturaleza, unidad_base, peso_unitario_g, vendible) y del ledger de stock a artículos; migración de `costos` (BOM) y `producto_base_id` al grafo; reescritura del cálculo de `/costos/ordenes-produccion/preview` y `/generar`; recálculo de `/costos/costos_materia_prima` y `/costos/precio_productos`.
- **Frontend**: páginas nuevas `src/pages/procesos` y `src/pages/maquinaria`; carga de gramaje por masa con validación de suma; tablero de carga del día; `ProductoForm.jsx` cambia `is_producto`/`producto_base_id` por `naturaleza`/`unidad_base`/`peso_unitario_g`; `OrdenPrint.jsx` pasa a tres bloques; `GenerarOrdenesPreviewPage.jsx` muestra kilos de masa además de unidades.
- **Datos**: el gramaje de cada bollo **no existe en ninguna tabla y no se puede deducir** — hay que relevarlo en planta producto por producto. Ese relevamiento es el camino crítico del change, no el código.
- Convive con `preview-generacion-ordenes`, `borrar-orden-y-generar-pendientes` y `reporte-semanal-ordenes`: este change cambia el motor de cálculo que esos usan, no sus pantallas.

## Fuera de Alcance (para una etapa siguiente)

- **Secuenciamiento automático (nivel N3)**: asignar máquina y horario a cada operación es un problema de optimización con restricciones. Este change llega hasta detectar que el día no cierra.
- Mantenimiento de máquinas: hay un campo `estado` para sacar una máquina de circulación y nada más.
- Valorización de stock (FIFO, costo promedio): `insumos.precio` sigue siendo un único valor mutable.
- Capacidad de personas y turnos individuales: el centro de trabajo tiene tarifa y capacidad agregada, no nómina.
- Programación en decimales: queda para más adelante; los productos en KG se programan en kilos enteros.
