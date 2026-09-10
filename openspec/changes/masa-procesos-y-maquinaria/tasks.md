## 1. F1 — Preparar el terreno (sin cambio de comportamiento)

- [x] 1.1 Backend: migración que agrega `KG` al enum de `unidad_medida` de `costos_productos`, sin cambiar ningún valor existente — **sin trabajo backend**: `unidad_medida` es `VARCHAR(10)` libre en el modelo y `str` libre en el schema pydantic, no hay enum ni CHECK. La restricción a GR/UN existía sólo en la constante del frontend (1.2)
- [x] 1.2 Frontend: agregar `KG` a `UNIDADES_MEDIDA_PRODUCTO` en `src/pages/productos/constants.js` y verificar que el selector de `ProductoForm.jsx` lo ofrece
- [x] 1.3 Backend: agregar `programacion_id` (nullable, FK a `costos_programacion`) a la línea de producto de la orden, y poblarlo en la generación actual — cierra las tres limitaciones citadas en `borrar-orden-y-generar-pendientes/design.md:42-44`
- [x] 1.4 Backend: agregar `orden_id` como FK real en `stock_movimientos`, poblarla desde el `referencia` string existente, y dejar `referencia` en su lugar hasta que nadie la lea (Risks)
- [x] 1.5 Backend: script de reconciliación de las 26 filas duplicadas de `(producto_id, fecha)` en `costos_programacion` — suma `plan` y `prod`, conserva una fila, y escribe un log de qué se fusionó (spec `planning-programacion`). `scripts/dedupe_programacion.sql`, SQL puro corrido con psql
- [x] 1.6 Backend: índice único sobre `(producto_id, fecha)` en `costos_programacion` y test que verifica que un segundo insert falla con el conflicto reportado
- [x] 1.7 Backend: test de regresión que confirma que la generación de órdenes produce exactamente las mismas cantidades de insumo antes y después de F1

## 2. F2 — Construir el grafo en paralelo

- [x] 2.1 Backend: migración de `articulo` como extensión de `costos_productos` — `naturaleza` (INSUMO/SEMIELABORADO/TERMINADO/RESIDUO), `unidad_base` (KG/UN/LT), `peso_unitario_g`, `vendible` (spec `procesos`, D3)
- [x] 2.2 Backend: migración de `proceso` — `tipo`, `lote_referencia`, `lote_unidad`, `lote_minimo`, `lote_multiplo`, `minutos_setup`, `responsable`, `vigente_desde` (D2, D12)
- [x] 2.3 Backend: migración de `proceso_linea` — `rol`, `articulo_id`, `cantidad`, `unidad`, `gramaje_g`, `porcentaje_panadero`, `merma_pct`, `rendimiento_pct`, `minutos_directos`, `minutos_maquina`, `criterio_reparto`, `orden` (D2, D3, D7, D8)
- [x] 2.4 Backend (`scripts/backfill_grafo_procesos.sql`, SQL puro): backfill de `naturaleza` — `is_producto = false` → SEMIELABORADO, `true` → TERMINADO, filas de `costos_insumos` → INSUMO; `vendible = true` para todo TERMINADO habilitado
- [x] 2.5 Backend: backfill de `unidad_base` desde `unidad_medida` (`GR` → KG con `peso_unitario_g` null, `UN` → UN con `peso_unitario_g` a completar en F3)
- [x] 2.6 Backend: backfill del proceso degenerado — cada producto sin `producto_base_id` genera un proceso ELABORACION 1:1 con su `lote_produccion` como `lote_referencia` y una única línea SALIDA al 100 % (caso 5 del relevamiento)
- [x] 2.7 Backend: backfill del proceso de división — cada producto con `producto_base_id` genera una línea SALIDA en el proceso DIVISION de su base, con `gramaje_g` en `NULL` a la espera del relevamiento — **excepción**: un hijo que además tiene `costos` propios genera un TRANSFORMACION (base + sus insumos → el hijo) en vez de una línea del DIVISION, porque el DIVISION lo comparten todos los hermanos y colgar de ahí los insumos de uno solo sería falso
- [x] 2.8 Backend: backfill de las líneas ENTRADA — cada fila de `costos` se copia como `proceso_linea` de rol ENTRADA sobre el proceso del producto que la tenía, con `insumo` y `cantidad` sin cambios
- [x] 2.9 Backend: validación de ciclos al guardar una línea, que reporta la cadena completa de procesos involucrados (Risks, spec `procesos`)
- [x] 2.10 Backend: validación de que un proceso tiene al menos una línea SALIDA o COPRODUCTO, y de que `lote_minimo` no supera `lote_referencia`
- [x] 2.11 Backend: `GET /costos/procesos` y `GET /costos/procesos/{id}` devolviendo el grafo completo, para que el frontend pueda reproducir la explosión — hoy imposible (`preview-generacion-ordenes/design.md:7`, Risks)
- [x] 2.12 Backend: `POST`/`PUT`/`DELETE` de `/costos/procesos` y sus líneas, con la validación de suma de ramas contra el lote como advertencia, no como bloqueo (spec `procesos`)
- [x] 2.13 Backend: versionado — editar un proceso ya referenciado por una orden emitida crea una versión nueva con nuevo `vigente_desde`; editar uno nunca usado lo modifica en el lugar (D12, Risks)
- [x] 2.14 Frontend: página `src/pages/procesos` con lista maestro-detalle siguiendo el patrón de `productos`, ruta registrada en `src/App.jsx`
- [x] 2.15 Frontend: editor de líneas de proceso con `rol`, artículo (picker que ya no filtra por `is_producto`), cantidad, y los campos de merma y rendimiento
- [x] 2.16 Test de backfill: para cada producto existente, la explosión por el grafo nuevo da exactamente el mismo resultado que el motor viejo cuando todos los gramajes de un proceso son iguales

## 3. F2b — Ledger de semielaborados

- [x] 3.1 Backend: extender `stock_movimientos` a artículos producidos, agregando los tipos `PRODUCCION` y `CONSUMO_INTERNO` (D4, spec `stock`)
- [x] 3.2 Backend: al finalizar una orden que produce un semielaborado, registrar `PRODUCCION` por la cantidad producida
- [x] 3.3 Backend: al consumir un semielaborado con stock, registrar `CONSUMO_INTERNO` y descontar el disponible — `stock_service.consumir_articulo` implementado y testeado; **quién lo llama** al generar una orden es la tarea 5.4, que es donde el motor nuevo empieza a consumir semielaborados
- [x] 3.4 Backend: `GET /costos/articulos/{id}/movimientos` con disponible, comprometido e historial, reutilizando la forma que ya usa `insumos`
- [x] 3.5 Frontend: vista de stock de semielaborados con disponible, comprometido y movimientos, reutilizando `MovimientosStockTable.jsx`
- [x] 3.6 Test: producir 162 kg y consumir 47 deja 115 kg disponibles y dos movimientos trazables a su orden

## 4. F3 — Relevar y cargar el gramaje

- [x] 4.1 Frontend: pantalla de carga por masa que lista las ramas de un proceso DIVISION y pide `gramaje_g`, `merma_pct`, `rendimiento_pct` y `minutos_directos` por rama
- [x] 4.2 Frontend: validación visible de la suma — kilos consumidos por todas las ramas contra el `lote_referencia`, mostrando la diferencia como advertencia sin bloquear el guardado (D13, spec `procesos`)
- [x] 4.3 Frontend: validación que exige `gramaje_g` en toda línea SALIDA cuyo artículo tiene `unidad_base = UN`, con el error sobre la línea concreta
- [x] 4.4 Frontend: `peso_unitario_g` obligatorio en `ProductoForm.jsx` cuando `unidad_base = UN`, y oculto cuando es KG (spec `productos`)
- [x] 4.5 Backend: `GET /costos/procesos/pendientes-relevamiento` que lista las líneas con `gramaje_g` en `NULL`, para medir el avance del relevamiento
- [x] 4.6 Frontend: indicador de avance del relevamiento — cuántas masas están completas sobre el total
- [x] 4.7 Backend: endpoint de comparación `POST /costos/ordenes-produccion/comparar` que, para una fecha, devuelve las cantidades de insumo del motor viejo y del nuevo lado a lado (Risks, Migration Plan) — **obligó a adelantar el cálculo de 5.1**: no se puede comparar contra un motor que no existe. La explosión por el grafo vive en `app/services/explosion_service.py` y por ahora sólo la usa este endpoint; 5.1 pasa a ser conectarla al preview y a la generación
- [x] 4.8 Frontend: reporte comparativo por fecha, marcando los insumos cuya cantidad cambia y por cuánto
- [ ] 4.9 Relevamiento en planta: cargar gramaje, merma, rendimiento y minutos de las masas de francés, chip y molde — las tres del relevamiento original — **requiere ir a la planta y pesar bollos**: la herramienta para cargarlo está lista (`/relevamiento`), el dato no
- [ ] 4.10 Relevamiento en planta: cargar el resto de las masas y de los procesos degenerados hasta que `pendientes-relevamiento` quede vacío — **requiere ir a la planta**, igual que 4.9

## 5. F4 — Cambiar el motor de explosión

- [x] 5.1 Backend: implementar `explotar_demanda(session, fecha, overrides) -> list[OrdenPreview]` sobre el grafo, con `Σ(cantidad × gramaje ÷ (1 − merma_pct))` por rama y suma en la unidad del semielaborado (spec `procesos`, D3)
- [x] 5.2 Backend: conversión de kilos de producto vendible a unidades usando `gramaje_g` y `rendimiento_pct`, para las ramas cuyo artículo tiene `unidad_base = KG`
- [x] 5.3 Backend: redondeo del requerimiento al `lote_multiplo`, nunca por debajo del `lote_minimo`, y cálculo del sobrante
- [x] 5.4 Backend: descontar el stock disponible del semielaborado antes de redondear a lote, y devolver cuánto sale de stock y cuánto de un lote nuevo (D5, spec `stock`)
- [x] 5.5 Backend: reemplazar `_redondear_insumo` por un redondeo sensible a la unidad — enteros para `UN`, tres decimales para `KG`/`LT`/`GR`/`ML`, sin piso de 1 (D6, spec `insumos`)
- [x] 5.6 Backend: test del redondeo nuevo — `0.4 KG → 0.400` (hoy da `1`), `12.4 UN → 12`, `0 → se omite del listado`
- [x] 5.7 Backend: agrupar las órdenes por `(proceso, responsable)` en lugar de `(producto_base_id, responsable)`, y guardar `proceso_id` y `proceso_version` en la orden (spec `ordenes-produccion`, D12)
- [x] 5.8 Backend: guardar `masa_kg`, `bollos` y `gramaje_g` en cada línea de producto de la orden
- [x] 5.9 Backend: poner `explotar_demanda` detrás de un flag de configuración que permite volver al motor viejo sin desplegar (Migration Plan, rollback de F4)
- [x] 5.10 Frontend: mostrar en `GenerarOrdenesPreviewPage.jsx` los kilos de masa por rama y el total del grupo, además de las unidades editables
- [x] 5.11 Frontend: mostrar el lote que se va a producir y el sobrante resultante cuando el requerimiento queda por debajo del `lote_minimo`, en lugar de sólo marcar la brecha en rojo
- [x] 5.12 Frontend: reescribir `OrdenPrint.jsx` en tres bloques — fórmula de la masa con porcentaje panadero, partición con masa/gramaje/bollos/programado, y recorrido de máquinas (vacío hasta F5)
- [x] 5.13 Verificar que `OblejaPrint.jsx`, el tablero semanal y el borrado de órdenes siguen funcionando sin cambios
- [ ] 5.14 Fecha piloto: activar el flag para una sola masa, comparar contra el reporte de 4.8 y documentar las diferencias antes de extenderlo — **operativo**: depende de que el relevamiento de 4.9/4.10 esté hecho y de correr una fecha real en producción con `MOTOR_GRAFO=true`

## 6. F5 — Maquinaria y carga del día

- [x] 6.1 Backend: migración de `maquina` — `codigo`, `nombre`, `tipo`, `capacidad`, `capacidad_unidad`, `minutos_setup`, `minutos_limpieza`, `area`, `estado`, `turno_desde`, `turno_hasta` (spec `maquinaria`)
- [x] 6.2 Backend: migración de `proceso_operacion` — `proceso_id`, `orden`, `nombre`, `maquina_tipo`, `capacidad_minima`, `minutos_por_bacha`, `minutos_por_unidad`, `requiere_operario`, `puede_solapar` (D10)
- [x] 6.3 Backend: migración de `orden_operacion` — `orden_id`, `proceso_operacion_id`, `maquina_id`, `bachas`, `inicio_previsto`, `fin_previsto`, `inicio_real`, `fin_real`, `estado`
- [x] 6.4 Backend: CRUD `/costos/maquinas` con validación de que `capacidad` exige `capacidad_unidad`
- [x] 6.5 Backend: cálculo de bachas `techo(cantidad ÷ capacidad_maquina)` y de la ocupación `bachas × (setup + minutos_por_bacha) + limpieza` (spec `maquinaria`)
- [x] 6.6 Backend: test del cálculo — 162 kg en una máquina de 60 kg con 5 de setup, 12 por bacha y 10 de limpieza da 3 bachas y 61 minutos
- [x] 6.7 Backend: resolución de máquina al emitir la orden — filtrar por `tipo`, `capacidad_minima` y `estado = ACTIVA`; si ninguna sirve, emitir igual y marcar la operación como no resuelta (D10)
- [x] 6.8 Backend: modo de ocupación por `capacidad_unidad` — exclusivo para `KG`/`LITROS`/`KG_HORA`, concurrente hasta la capacidad para `CARROS`/`BANDEJAS` (D11)
- [x] 6.9 Backend: `requiere_operario` cuenta ocupación de máquina siempre y de mano de obra sólo cuando es verdadero (spec `maquinaria`)
- [x] 6.10 Backend: `GET /costos/carga-dia?fecha=` que suma las operaciones de todas las órdenes de la fecha por `maquina_tipo` y devuelve capacidad, requerido, uso y estado
- [x] 6.11 Backend: advertencia de sobrecapacidad en el preview de generación, con el tipo y el exceso, sin bloquear la confirmación
- [x] 6.12 Backend: validación blanda del lote contra la capacidad de la amasadora, mostrando el desperdicio de la última bacha (D13)
- [x] 6.13 Frontend: página `src/pages/maquinaria` con el catálogo CRUD, ruta registrada en `src/App.jsx`
- [x] 6.14 Frontend: editor de operaciones dentro del detalle de proceso, con selector de `maquina_tipo` y `capacidad_minima`
- [x] 6.15 Frontend: tablero de carga del día, una fila por `maquina_tipo`, ordenado por uso descendente, con el estado como pill (Holgado / Ajustado / Cuello de botella)
- [x] 6.16 Frontend: mostrar la advertencia de sobrecapacidad en `GenerarOrdenesPreviewPage.jsx` antes del botón "Generar"
- [x] 6.17 Frontend: completar el bloque de recorrido de máquinas en `OrdenPrint.jsx` con etapa, máquina resuelta, bachas y ocupación estimada
- [ ] 6.18 Cargar el catálogo real de máquinas de la planta con capacidades, setup, limpieza y turno — **relevamiento de planta**, igual que 4.9/4.10: la pantalla está en `/maquinaria`, los datos hay que medirlos

## 7. F6 — Costeo por capas y fraccionamiento

- [x] 7.1 Backend: migración de `centro_trabajo` con tarifa horaria y capacidad de turno, y backfill de las cuatro filas del enum `responsable` actual (D14)
- [x] 7.2 Backend: tarifa horaria por máquina, como campo de `maquina`
- [x] 7.3 Backend: cálculo del costo por unidad del semielaborado — `(Σ(cantidad × precio) + minutos de amasado × tarifa) ÷ cantidad buena del lote` (spec `reportes-costos`)
- [x] 7.4 Backend: cálculo del costo de rama — costo del semielaborado consumido, más `minutos_directos × tarifa del centro`, más `minutos_maquina × tarifa de la máquina`
- [x] 7.5 Backend: costo unitario dividiendo el costo de rama por la salida buena, en unidades o en kilos según la `unidad_base` del artículo
- [x] 7.6 Backend: test del caso de referencia — dos ramas de la misma masa con distinto `minutos_directos` dan el mismo costo por kilo de masa y distinto costo unitario
- [x] 7.7 Backend: proceso FRACCIONAMIENTO con líneas COPRODUCTO y RESIDUO, y reparto del costo del insumo por peso, absorbiendo el residuo sin valor entre las salidas buenas (D7)
- [x] 7.8 Backend: test del reparto — 6,00 kg a $18.000 en 4,32 + 1,20 + 0,48 de residuo da $14.087 y $3.913
- [x] 7.9 Backend: reescribir `/costos/costos_materia_prima` sobre el costo por capas, con `costo_unitario_mp`, `costo_unitario_mo` y `costo_unitario_maquina` separados — el cálculo nuevo entra **detrás del mismo flag `MOTOR_GRAFO`** que el motor de órdenes, no en reemplazo directo: sin gramajes cargados el costo por capas queda incompleto y reescribir el reporte en el acto rompería uno que hoy funciona
- [ ] 7.10 Backend: reconstruir `/costos/precio_productos` con un solo campo por figura y retirar el par `costo_*` / `costo_*_new` una vez que la comparación de un mes cerrado coincida (spec `reportes-costos`) — **la mitad hecha**: `costo_unitario_maquina` ya es la figura única y `/costos/costos_materia_prima` la expone. El retiro del par está bloqueado por su propia condición: hace falta un mes cerrado de datos reales y alguien que firme la comparación (Open Question del design)
- [x] 7.11 Backend: reporte de desvío entre la merma declarada en la línea y la registrada al finalizar, por producto y fecha (D8)
- [x] 7.12 Frontend: vista de costo de un semielaborado con su costo por unidad y las líneas de insumo y mano de obra que lo componen
- [x] 7.13 Frontend: actualizar `CostosMateriaPrimaDetailPage.jsx` para mostrar las dos capas en vez del desglose aplanado
- [x] 7.14 Frontend: actualizar `EstimacionesPage.jsx` y `PrecioProductosPage.jsx` a los campos únicos

## 8. Cierre — retiro de lo reemplazado

- [ ] 8.1 Backend: decidir y ejecutar el backfill de `proceso_id` en las órdenes históricas, o aceptarlas sin proceso asociado (Open Questions)
- [ ] 8.2 Backend: retirar `producto_base_id` e `is_producto` de `costos_productos` una vez que nada los lea
- [ ] 8.3 ~~Backend: retirar `ref_id`, `prioridad` y `utilidad`~~ — **cancelada**: la premisa era falsa. El relevamiento decía que no tienen consumidor *en el frontend*, y eso se generalizó mal. En el backend `prioridad` ordena `GET /costos/productos` y las filas de la grilla de Programación (`programacion_service.py`), `utilidad` alimenta el `precio_sugerido` de `costeo_service.py`, y `ref_id` se agrupa en las consultas de `analytics_service.py`. Retirarlos rompería analytics y el reporte de precios
- [ ] 8.4 Backend: mover `lote_produccion` y `tiempo_produccion` al proceso y retirarlos del producto
- [ ] 8.5 Backend: retirar `stock_movimientos.referencia` una vez que `orden_id` sea la única lectura
- [ ] 8.6 Frontend: quitar de `ProductosPage.jsx` y `ProductoForm.jsx` los campos retirados (`lote_produccion`, `tiempo_produccion`) y el filtro `is_producto`, reemplazado por `naturaleza` (spec `productos`). `ref_id`, `prioridad` y `utilidad` se quedan — ver 8.3
- [ ] 8.7 Frontend: retirar `ProductoCostosDetail.jsx` y `CostosLinesEditor.jsx`, reemplazados por el editor de proceso
- [ ] 8.8 Backend: retirar el flag del motor viejo y borrar `calcular_ordenes` una vez que un mes completo corra con el motor nuevo
- [ ] 8.9 Actualizar `openspec/specs/` con los deltas de este change y archivarlo
