## Context

El sistema modela hoy cada producto como una lista plana de insumos (`costos`) escalada por un `lote_produccion`. Sobre esa base se agregó `producto_base_id` para vincular un producto final a la masa de la que sale, y las órdenes ya se agrupan por `(producto_base_id, responsable)`. La intuición del dominio está, pero falta el número: **`producto_base_id` dice de qué masa sale un producto, nunca cuánta masa consume**. La consecuencia es aritmética y está en producción: `GenerarOrdenesPreviewPage.jsx:173` calcula `total = Σ cantidad` sobre productos heterogéneos y `:184` lo divide por el `lote_produccion` del base.

A eso se suman cuatro límites verificados en el repositorio:

- La línea de BOM apunta siempre a `insumo`, nunca a `producto` (`ProductoCostosDetail.jsx:19-24`): no hay multinivel real.
- `is_producto` es un booleano excluyente (`ProductoForm.jsx:22`): nada puede ser terminado y componente a la vez.
- Las unidades de producto son sólo `GR` y `UN` (`src/pages/productos/constants.js:14-17`): no existe `KG`.
- `tiempo_produccion` se carga y se muestra pero no entra en ningún cálculo (`ProductoForm.jsx:153`); `costo_unitario_mo` aparece en los reportes sin ninguna fuente de datos conocida.

El backend vive en un repo separado. El frontend no puede reproducir hoy el cálculo de recetas porque no hay endpoint que devuelva el BOM de un producto (`openspec/changes/preview-generacion-ordenes/design.md:7`).

## Goals / Non-Goals

**Goals:**

- Que la cantidad de masa a preparar salga de `Σ(cantidad × gramaje)` y no de sumar unidades heterogéneas.
- Que una masa se pueda partir en varios productos de distinto gramaje, y que un semielaborado pueda alimentar otro proceso sin límite de profundidad.
- Que un artículo pueda venderse y a la vez ser componente de otro (brownie → cuadrados a venta + discos a postre).
- Que un producto se pueda medir en kilos o en unidades, y que el sistema convierta entre ambos.
- Que el costo se arme en dos capas —masa por kilo, tiempo y horno por rama— para que dos productos de la misma masa no cuesten lo mismo.
- Que el sistema sepa qué máquina ocupa cada proceso y avise cuando el día no entra.
- Que cambiar una receta deje de reescribir el costo histórico en silencio.

**Non-Goals:**

- Secuenciamiento automático (nivel N3): asignar máquina y horario a cada operación. Este change llega hasta detectar sobrecapacidad.
- Valorización de stock (FIFO, costo promedio). `insumos.precio` sigue siendo un único valor mutable.
- Programación en decimales. Los productos en KG se programan en kilos enteros.
- Mantenimiento de máquinas más allá del campo `estado`.
- Capacidad de personas y turnos individuales.

## Decisions

### D1 — Un solo change con las seis fases

Las seis fases van en un único change con `tasks.md` seccionado por fase, no en seis changes separados.

**Por qué**: las decisiones de modelo se sostienen entre sí —el gramaje no significa nada sin la unidad base, el costeo por capas no cierra sin el semielaborado como artículo— y repartirlas en seis `design.md` obligaría a repetir el mismo razonamiento seis veces.

**Alternativa descartada**: dos changes, uno de modelo y otro de maquinaria. Es defendible porque F5 no depende del relevamiento de gramaje, pero parte en dos la tabla de decisiones que da coherencia al conjunto.

**Costo aceptado**: es un change grande que va a tardar en archivarse. Las fases están ordenadas para que las tres primeras no cambien nada visible y sean reversibles.

### D2 — Tres primitivas, no una entidad "Masa"

El dominio se modela con `articulo` (con `naturaleza`), `proceso` (con `tipo`) y `proceso_linea` (con `rol`). No se crea una entidad Masa ni una entidad Receta separada.

**Por qué**: la regla de cierre —la salida de un proceso es un artículo, y ese artículo puede ser la entrada de otro— hace que masa, masa integral, bollo y pan de molde integral sean cuatro artículos y tres procesos, sin ningún caso especial. Los cinco casos relevados se cubren con cuatro `tipo` de proceso: ELABORACION, DIVISION, TRANSFORMACION y FRACCIONAMIENTO.

**Alternativa descartada**: una entidad Masa con sus propias tablas. Ya fue descartada una vez en `ordenes-produccion-stock/design.md:31-32` por la misma razón, y volvería a fallar en el caso 3, donde parte de la masa se convierte en otra masa.

### D3 — El gramaje vive en la línea; la unidad base vive en el artículo

`proceso_linea.gramaje_g` dice cuánta masa consume un bollo. `articulo.unidad_base` dice cómo se cuenta el stock y se factura. Son dos preguntas distintas y hoy están mezcladas en `unidad_medida`.

**Por qué**: el francés se vende por kilo pero se produce por bollo de 180 g o 360 g. Sin separar las dos cosas no se puede costear por kilo y programar por bollo al mismo tiempo. `peso_unitario_g` en el artículo es la bisagra que traduce en las dos direcciones.

**Alternativa descartada**: un único factor de conversión por producto. No alcanza: el mismo producto puede salir de la misma masa con dos gramajes distintos según el formato.

### D4 — Los semielaborados llevan stock propio

El ledger de movimientos se extiende de insumos a artículos producidos, con los tipos PRODUCCION y CONSUMO_INTERNO.

**Por qué**: es la decisión del equipo. Permite amasar hoy y usar mañana, y hace que el sobrante de un redondeo a lote tenga un destino real en vez de evaporarse.

**Alternativa descartada**: masa virtual dentro de la orden, que se produce y se consume sin dejar saldo. Era la opción más chica y la que este documento recomendaba, porque hoy no hay stock ni de producto terminado y abrir un ledger de artículos producidos es un proyecto en sí mismo.

**Costo aceptado**: amplía el alcance del change con movimientos de producto, que hasta ahora eran un no-goal explícito (`ordenes-produccion-stock/design.md:25`). Se aísla en su propia fase (F2b) para que, si hay que postergarlo, F4 pueda salir igual tratando el sobrante como una línea declarativa sin saldo.

### D5 — El sobrante del redondeo queda como stock de masa

La diferencia entre el lote redondeado y el requerimiento se registra como stock del semielaborado, y la orden siguiente lo consume antes de amasar de nuevo.

**Por qué**: es consecuencia directa de D4 y evita el prorrateo, que esconde justamente el dato que sirve para revisar si el `lote_minimo` está bien elegido.

**Alternativa descartada**: repartir el sobrante entre las ramas y producir de más.

### D6 — La Programación sigue en enteros; sólo los insumos pasan a decimales

`costos_programacion.plan` y `prod` siguen siendo `INTEGER`. Se corrige únicamente el redondeo de cantidades de insumo, que pasa a ser sensible a la unidad y pierde el piso de 1.

**Por qué**: es la decisión del equipo, y evita tocar la validación de la grilla de ag-Grid, que hoy exige enteros (`GenerarOrdenesPreviewPage.jsx:17-21`).

**Consecuencia que hay que asumir**: un producto con `unidad_base = KG` se programa en kilos enteros. Para el pan francés eso es suficiente —se programa "81 kg"—, pero cualquier producto que necesite media unidad de precisión tendrá que programarse por unidad. La grilla debe mostrar la unidad base de cada fila para que la diferencia sea legible.

**Alternativa descartada**: decimales end-to-end (`numeric(10,3)`), que era la recomendación de este documento. Queda como no-goal, no como decisión cerrada en contra.

### D7 — El costo conjunto se reparte por peso

En un FRACCIONAMIENTO, el costo del artículo de entrada se reparte entre los coproductos en proporción a su peso, y el residuo sin valor se absorbe entre las salidas buenas.

**Por qué**: es explicable en la planta y no depende de listas de precios que cambian. El campo `criterio_reparto` queda en el esquema con valores PESO y VALOR, así que cambiar el criterio de un proceso más adelante no requiere migración.

**Alternativa descartada**: reparto por valor de venta relativo, más fiel al criterio contable de costos conjuntos, pero que hace que el costo del disco —y por lo tanto el del postre— se mueva cada vez que cambia un precio.

### D8 — La merma se declara y se mide

`proceso_linea.merma_pct` dimensiona cuánto hay que producir; el `cantidad_desperdicio` que ya se registra al finalizar se compara contra ese porcentaje.

**Por qué**: hoy sólo existe el registrado (`FinalizarOrdenSection.jsx:11-13`), no dimensiona nada y ni siquiera afecta el costo. Con los dos, el desvío entre esperado y real se vuelve un reporte.

**Alternativa descartada**: sólo la planificada, que deja de medir; o sólo la registrada, que es el estado actual y hace que la producción quede corta siempre en la misma proporción.

### D9 — Maquinaria hasta el nivel N2: detectar, no planificar

Se implementa el catálogo de máquinas, las etapas por proceso, el cálculo de bachas y el tablero de carga del día con aviso de sobrecapacidad. No se asignan horarios.

**Por qué**: el salto de valor grande está entre no saber nada y saber que el día no entra. Elegir el horario óptimo, con la planta resolviéndolo a mano hace años, es una mejora más chica y bastante más cara: es un problema de scheduling con restricciones de precedencia, capacidad y turno.

**Alternativa descartada**: N1, que sólo imprime el recorrido y no avisa nada; y N3, que planifica y necesita tiempos cargados y confiables que todavía no existen.

### D10 — La etapa apunta a un tipo de máquina, no a una máquina

`proceso_operacion.maquina_tipo` más `capacidad_minima`. La máquina concreta se resuelve al emitir la orden y se guarda en `orden_operacion.maquina_id`.

**Por qué**: si la receta apunta a "Amasadora #2", cada mantenimiento obliga a editar recetas y se pierde la posibilidad de reacomodar el día. Con el tipo, sacar una máquina de circulación es cambiar su `estado`.

**Alternativa descartada**: máquina concreta en la receta, más simple de implementar y de leer; y tipo con máquina preferida opcional, que agrega un campo para un caso que N2 no necesita.

### D11 — La cámara se cuenta en carros; la amasadora, en horas exclusivas

`capacidad_unidad` decide el modo de ocupación: KG, LITROS y KG_HORA son exclusivos; CARROS y BANDEJAS son concurrentes hasta la capacidad.

**Por qué**: tratar todo como exclusivo subestima mucho la capacidad de la cámara y produce falsos avisos de sobrecapacidad; tratar todo como concurrente modela mal la amasadora, que sí es exclusiva. El campo que hace falta ya está en el modelo.

### D12 — Las recetas se versionan y la orden congela su versión

`proceso.vigente_desde` más `orden_produccion.proceso_version`.

**Por qué**: hoy editar una receta reescribe el costo histórico hacia atrás en silencio, y con el costeo por capas eso empeora, porque el cambio se propaga a todos los productos que consumen la masa. Ninguna orden guarda hoy la receta con la que se generó: sólo el resultado explotado.

**Alternativa descartada**: sólo congelar en la orden, sin historial consultable de recetas. Da trazabilidad de producción pero no permite recostear un mes cerrado.

### D13 — El lote se valida contra la capacidad de la amasadora, pero no se bloquea

Al guardar un proceso, si su `lote_referencia` no es múltiplo de la capacidad de la máquina que lo va a amasar, se muestra cuánto se desperdicia de la última bacha y se deja guardar igual.

**Por qué**: un lote de 162 kg en una amasadora de 60 corre la tercera bacha a 42 de 60. Conviene avisarlo, no prohibirlo: hay masas legítimas que se hacen en dos máquinas distintas.

### D14 — `responsable` pasa a ser centro de trabajo con tarifa

Panadería, Pastelería, Pastas y Galletas pasan de enum a filas de `centro_trabajo` con tarifa horaria y capacidad de turno, en la fase de costeo.

**Por qué**: sin tarifa no hay costo de mano de obra real, y hoy `costo_unitario_mo` aparece en `/costos/precio_productos` sin ninguna fuente de datos en la aplicación. El tiempo de operario sin máquina —el formado a mano— sólo se puede costear con una tarifa de centro.

**Alternativa descartada**: dejar el enum y tomar la tarifa sólo de la máquina, que deja sin costo justamente el formado, que es donde está la diferencia entre el francés y el pebete.

## Risks / Trade-offs

- **El gramaje no existe en ninguna tabla y no se puede deducir** → Es el camino crítico del change, y es relevamiento de planta, no código. Se aísla en F3, con el motor viejo todavía mandando, una pantalla de carga por masa que valida la suma de las ramas contra el lote, y un reporte comparativo viejo-contra-nuevo por fecha antes de cambiar nada.
- **Cambia lo que se reserva de insumos (BREAKING)** → F4 se activa con una fecha piloto y una sola masa, con el reporte comparativo de F3 como criterio de corte. Rollback: el motor viejo queda detrás de un flag hasta que la comparación cierre en un mes completo.
- **El ledger de semielaborados amplía el alcance más allá del mínimo** → Se aísla en F2b. Si hay que postergarlo, F4 sale igual tratando el sobrante como una línea declarativa sin saldo, y D5 se degrada a "línea explícita de excedente" sin tocar el resto del diseño.
- **Programación entera con productos en KG** → Los productos que necesiten precisión sub-kilo tendrán que programarse por unidad. La grilla debe mostrar `unidad_base` por fila para que la elección sea explícita y no un accidente.
- **Ciclos en el grafo de procesos** → Validación de ciclo del lado del backend al guardar una línea, que reporta la cadena completa. La validación de auto-referencia del cliente existente (`ProductoForm.jsx:66-73`) no alcanza para cadenas de más de un salto.
- **El versionado multiplica filas de `proceso_linea`** → Sólo se crea versión nueva al editar un proceso ya referenciado por una orden emitida. Editar un proceso nunca usado lo modifica en el lugar.
- **Reparto por peso cuando un coproducto vale mucho más** → El costo del coproducto caro queda subestimado. `criterio_reparto` está en el esquema desde el principio, así que cambiar un proceso a VALOR no requiere migración de datos.
- **El backend está en otro repo y el frontend no puede reproducir el cálculo** → Se expone `/costos/procesos/{id}` con el grafo completo, para que el preview pueda mostrar la explosión y no sólo su resultado. Sin ese endpoint, F3 no tiene cómo validar el relevamiento.
- **El índice único revierte una decisión de un change abierto** → `preview-generacion-ordenes/design.md:45-51` (Decision 3) afirma que dentro de un grupo puede haber más de una fila de Programación para el mismo `producto_id`, y de ahí sale que los overrides se lleven por `programacion_id`. Con el índice de F1 ese estado deja de ser representable: un producto aparece a lo sumo una vez por fecha. **El mecanismo sobrevive, la justificación no** — llevar los overrides por `programacion_id` sigue siendo lo correcto, y ahora es además la forma explícita de reconciliar orden contra Programación (F1 tarea 1.3). Consecuencias concretas: el test `test_generar_ordenes_keeps_one_linea_per_programacion_row` se reescribió para afirmar el invariante nuevo, y el `setdefault` de `sincronizar_ejecutado_programacion` (Decision 7 del change archivado) queda como código defensivo inalcanzable. Vale revisar la Decision 3 de `preview-generacion-ordenes` antes de archivar ese change.
- **Los duplicados de `(producto_id, fecha)` en Programación** → Hay 26 filas duplicadas detectadas en producción (`archive/2026-09-07-.../tasks.md:3`). Se reconcilian sumando `plan` y `prod` en F1, antes de poner el índice único, y se deja registro de qué se fusionó.

## Migration Plan

Seis fases. Las tres primeras no cambian nada visible y son reversibles; F4 es la primera que la operación nota.

Los scripts de migración de datos de este change son **SQL puro** corrido con `psql`, no Python: `scripts/dedupe_programacion.sql` y `scripts/backfill_grafo_procesos.sql`. El dry run se hace envolviendo el archivo en una transacción que se revierte, y los `SELECT` de reporte se imprimen igual, así que lo listado es exactamente lo que pasaría. Los tests ejecutan el archivo tal cual en lugar de reimplementar su lógica, de modo que lo que se prueba es lo que después se corre en producción.

**F1 · Preparar el terreno.** `KG` en las unidades de producto; `programacion_id` en la línea de producto de la orden; `orden_id` como FK real en los movimientos de stock; reconciliación de los duplicados de `(producto_id, fecha)` y su índice único. Sin impacto en pantalla. *Rollback: revertir migraciones, nada depende todavía.*

**F2 · Construir el grafo en paralelo.** Se crean `articulo` (extensión de `costos_productos`), `proceso` y `proceso_linea` y se llenan por backfill: `naturaleza` derivada de `is_producto`; cada producto sin base genera un proceso degenerado 1:1 con su `lote_produccion`; cada producto con base genera una línea SALIDA con `gramaje_g` vacío; cada fila de `costos` se copia como línea ENTRADA. El motor viejo sigue mandando y el grafo sólo se lee para comparar. *Rollback: borrar las tablas nuevas.*

**F2b · Ledger de semielaborados.** Extensión del ledger a artículos producidos con PRODUCCION y CONSUMO_INTERNO. Independiente de F3 y F4. *Rollback: los movimientos de artículo quedan sin lectores; el resto sigue.*

**F3 · Relevar y cargar el gramaje.** La fase larga y la única que no se automatiza: peso del bollo crudo, merma de división, rendimiento de horno y minutos de formado, producto por producto. Pantalla de carga por masa con validación de la suma de las ramas contra el lote. Reporte comparativo motor viejo contra motor nuevo por fecha. *Rollback: no aplica, sólo se cargan datos.*

**F4 · Cambiar el motor.** El preview y la generación explotan por el grafo: `Σ(cantidad × gramaje)`, redondeo sensible a la unidad, orden impresa en tres bloques. Fecha piloto con una sola masa. *Rollback: flag que devuelve el motor viejo; el grafo queda cargado.*

**F5 · Maquinaria y carga del día.** Catálogo de máquinas, operaciones por proceso, bachas, recorrido impreso (N1) y tablero de carga con aviso de sobrecapacidad (N2). No depende de F3 ni de F4 y puede correr en paralelo con ellas. *Rollback: ocultar el tablero; nada más lo consume.*

**F6 · Costeo por capas y fraccionamiento.** `centro_trabajo` con tarifa, costo del semielaborado por kilo, coproductos y residuo con reparto por peso, y retiro de `producto_base_id`, `is_producto` y el par `costo_*` / `costo_*_new`. *Rollback: los reportes vuelven al cálculo aplanado; la producción no se ve afectada.*

**Corrección sobre los campos legacy.** Este documento afirmaba que `ref_id`, `prioridad` y `utilidad` no tienen consumidor y podían retirarse. Es falso: el relevamiento original decía que no lo tienen *en el frontend*, y se generalizó mal. En el backend `prioridad` ordena `GET /costos/productos` y las filas de la grilla de Programación, `utilidad` alimenta el `precio_sugerido` del reporte de costos, y `ref_id` se agrupa en las consultas de `analytics_service`. Se conservan; la tarea que los retiraba quedó cancelada.

## Open Questions

- **¿De dónde salen las tarifas horarias?** No hay hoy ninguna fuente de tarifa por centro de trabajo ni por máquina en la aplicación. Hay que definir quién las carga y con qué frecuencia se revisan antes de que F6 pueda calcular mano de obra.
- **¿El `responsable` de una orden lo define el proceso o sigue viniendo de la Programación?** Hoy viene de la fila de Programación. Con el proceso declarando un centro de trabajo, hay dos fuentes posibles y hay que elegir una.
- **¿Los tiempos por rama se relevan en el mismo pase que el gramaje?** Relevar minutos de formado junto con el gramaje ahorra una visita a planta, pero alarga F3 y los tiempos sólo se necesitan en F6.
- **¿Qué pasa con las órdenes ya emitidas cuando se retira `producto_base_id` en F6?** Hay que decidir si se les hace backfill de `proceso_id` retroactivo o si se aceptan órdenes históricas sin proceso asociado.
- **¿Quién valida el mes de contraste del reporte de precios?** El retiro del par `costo_*` / `costo_*_new` depende de que el reporte reconstruido coincida con los valores `*_new` en un mes cerrado, y hace falta alguien que firme esa comparación.
