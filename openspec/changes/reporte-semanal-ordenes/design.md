## Context

Las Órdenes de Producción hoy se ven en `OrdenesProduccionPage.jsx`: un `DataGrid` plano ordenado por fecha descendente, con filtros de fecha exacta y estado. Responde bien "dónde está la orden X" y mal "cómo viene la semana".

Tres cosas del proyecto condicionan el diseño:

1. **`GET /costos/ordenes-produccion` ya acepta `fecha_desde` y `fecha_hasta`**, y devuelve `codigo`, `fecha_fabricacion`, `responsable`, `estado` y `productos[].producto.nombre`. Es exactamente lo que el tablero necesita: no hace falta tocar el backend.
2. **La semana de negocio es lunes a sábado.** `programacion_service.generate_programacion` construye sus días con `weekday() != 6`, es decir excluye solo el domingo, y agrupa semanas con `extract('week' from fecha)` de Postgres, que es ISO y arranca el lunes.
3. **Desde `preview-generacion-ordenes` se puede generar para cualquier fecha**, domingo incluido. Un tablero de lunes a sábado fijo escondería esas órdenes sin avisar.

`ESTADO_LABELS` y `ESTADO_BADGE` ya viven en `src/pages/ordenes-produccion/constants.js` y los usan tanto el listado como el detalle.

## Goals / Non-Goals

**Goals:**

- Que la semana entera se lea de un vistazo, con el estado de cada orden visible sin abrir nada.
- Que ninguna orden de la semana quede fuera del tablero.
- Llegar al detalle de una orden en un click.
- Poder mirar la semana anterior y la siguiente.

**Non-Goals:**

- Tocar el backend.
- Filtrar, reordenar, arrastrar órdenes o cambiarles el estado desde el tablero.
- Reemplazar la grilla de Órdenes de Producción: conviven.
- Mostrar insumos o cantidades en la tarjeta.

## Decisions

### Decision 1 — La semana se identifica por su lunes, en la URL

`?semana=YYYY-MM-DD`, donde el valor es siempre el **lunes** de la semana mostrada. Sin el parámetro, el lunes de hoy.

*Por qué el lunes y no un número de semana ISO:* un `YYYY-WW` obliga a resolver el año ISO, que en la última semana de diciembre no coincide con el año calendario — el propio backend tiene que lidiar con eso en `copy_week` (`extract(isoyear ...)`). Una fecha concreta no tiene ese problema y se lee sola.

*Por qué en la URL:* mismo criterio que la fecha del preview de generación — sobrevive al refresh y el enlace se puede compartir. Un valor que no parsee como fecha cae a la semana actual.

### Decision 2 — El domingo es una columna condicional, no fija

Se piden siempre los 7 días al backend (`fecha_desde` = lunes, `fecha_hasta` = domingo) y se renderizan las 6 columnas de lunes a sábado; la de domingo se agrega solo si trajo órdenes.

*Por qué:* es lo que hace consistente el tablero con la Programación sin volverlo mentiroso. Cuesta una columna vacía en el request y nada en la pantalla.

*Alternativa descartada:* pedir solo hasta el sábado. Más barato, pero una orden de domingo desaparecería del reporte sin ninguna señal — y ahora que la fecha de generación es libre, eso puede pasar de verdad.

*Alternativa descartada:* mostrar siempre el domingo. Una columna casi siempre vacía ocupando un séptimo del ancho, todas las semanas.

### Decision 3 — Un solo fetch por semana, agrupado en el cliente

Una llamada con el rango de la semana, y el agrupamiento por día se hace en memoria con `useMemo`.

*Por qué:* son como mucho unas decenas de órdenes por semana. Siete llamadas (una por día) multiplicarían la latencia y el manejo de estados de carga por siete, sin ganar nada.

*Cuidado:* `fecha_fabricacion` llega como `'YYYY-MM-DD'`. Se agrupa comparando ese string tal cual contra la fecha de cada columna formateada igual, **sin construir un `Date`**: `new Date('2026-09-08')` se interpreta como UTC y en Argentina (UTC-3) retrocede un día, que es la forma clásica de que una orden aparezca en la columna equivocada.

### Decision 4 — Ruta `/produccion/semana`, fuera del espacio de `/ordenes-produccion`

*Por qué:* `/ordenes-produccion/:id` ya obligó a colar `/ordenes-produccion/generar` antes que la ruta dinámica. Sumar un segundo hermano estático hace más frágil ese orden. Un prefijo propio evita el problema de raíz.

### Decision 5 — Página nueva, sin tocar el listado ni sus componentes

Componente nuevo en `src/pages/ordenes-produccion/`, que importa `ESTADO_LABELS`/`ESTADO_BADGE` de `constants.js` y navega a `/ordenes-produccion/:id`.

*Por qué:* el tablero y la grilla responden preguntas distintas y no comparten estructura. Intentar parametrizar `DataGrid` para que rinda columnas por día sería más código y peor en los dos casos.

### Decision 6 — Tarjeta accesible por teclado

Cada tarjeta es un `<button>`, no un `<div onClick>`.

*Por qué:* la tarjeta es la única forma de llegar al detalle desde esta pantalla; con un `div` no habría foco ni Enter, y el reporte quedaría inutilizable sin mouse.

## Risks / Trade-offs

- **Una semana con muchas órdenes hace columnas muy largas** → Se acepta: la alternativa (paginar o colapsar dentro del día) esconde justo lo que el reporte quiere mostrar. Cada columna scrollea si hace falta, y el contador por día da la magnitud sin leer todas las tarjetas.
- **Seis o siete columnas no entran cómodas en una pantalla angosta** → El contenedor scrollea horizontalmente, como ya hace `.table-container` en el resto de la app. No se diseña una vista mobile aparte en este change.
- **Corridas de zona horaria al agrupar por día** → Mitigado por Decision 3: comparación de strings `YYYY-MM-DD`, sin `Date` de por medio. Es el error más probable de todo el change y merece una verificación explícita con una orden en el borde de la semana.
- **El tablero no filtra por responsable** → Con cuatro áreas y pocas órdenes por día alcanza con leer el responsable en la tarjeta. Si crece, filtrar es un agregado natural; queda fuera de alcance a propósito.

## Migration Plan

No hay migración ni cambio de backend. Es una página nueva más una entrada de menú: se despliega con el frontend y no afecta nada existente. Rollback: revertir el commit.

## Open Questions

- ¿Conviene marcar visualmente la columna de hoy dentro de la semana actual? Parece útil y barato; este change lo incluye como detalle de implementación, no como requisito.
- Si más adelante hay muchas órdenes por día, ¿el reporte debería filtrar por responsable o directamente ofrecer una vista por área? Fuera de alcance hasta ver el volumen real.
