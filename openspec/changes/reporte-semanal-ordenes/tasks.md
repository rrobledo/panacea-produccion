## 1. Página y ruta

- [x] 1.1 Crear `src/pages/ordenes-produccion/SemanaProduccionPage.jsx` y registrar la ruta `/produccion/semana` en `src/App.jsx`, fuera del espacio de `/ordenes-produccion` para no sumar otro hermano estático delante de `/ordenes-produccion/:id` (Decision 4)
- [x] 1.2 Agregar "Semana de Producción" a la sección Producción de `src/components/layout/AppLayout.jsx`, junto a "Órdenes de Producción" y "Producto Fabricado"
- [x] 1.3 Resolver la semana mostrada: `?semana=YYYY-MM-DD` con el **lunes** de esa semana; sin parámetro o con un valor que no parsee, el lunes de hoy (Decision 1)

## 2. Datos de la semana

- [x] 2.1 Pedir las órdenes con una sola llamada a `GET /costos/ordenes-produccion` usando `fecha_desde` = lunes y `fecha_hasta` = **domingo**, para no perder las órdenes de domingo (Decision 2 y 3)
- [x] 2.2 Agrupar por día en un `useMemo`, comparando `fecha_fabricacion` **como string `YYYY-MM-DD`** contra la fecha de cada columna formateada igual — sin construir `Date`, que en UTC-3 corre las órdenes un día para atrás (Decision 3)
- [x] 2.3 Ordenar las tarjetas dentro de cada día de forma estable (por `codigo`), para que el tablero no cambie de orden entre recargas
- [x] 2.4 Manejar carga con `PageLoader` y error con `ErrorState` + reintento, siguiendo el patrón del resto de las páginas

## 3. Tablero

- [x] 3.1 Renderizar las 6 columnas de lunes a sábado, cada una con su nombre de día, su fecha y la cantidad de órdenes que tiene
- [x] 3.2 Agregar la columna de domingo **solo** si ese domingo trajo órdenes (Decision 2)
- [x] 3.3 Mostrar los días sin órdenes como columna vacía con una leyenda, en vez de omitirlos
- [x] 3.4 Estado vacío de toda la semana: las seis columnas vacías más un aviso de que la semana no tiene órdenes
- [x] 3.5 Permitir scroll horizontal del contenedor para pantallas angostas, como hace `.table-container` en el resto de la app
- [x] 3.6 Resaltar la columna de hoy cuando se está viendo la semana actual

## 4. Tarjeta de orden

- [x] 4.1 Renderizar cada orden como un `<button>` —no un `div` con onClick— para que sea alcanzable por teclado y accionable con Enter (Decision 6)
- [x] 4.2 Mostrar en la tarjeta el Código, el Estado como badge, el Responsable/Área y los nombres de los productos
- [x] 4.3 Usar `ESTADO_LABELS` y `ESTADO_BADGE` de `./constants` para que la etiqueta y el color coincidan con el listado y el detalle (Decision 5)
- [x] 4.4 Al activar la tarjeta, navegar a `/ordenes-produccion/:id`

## 5. Navegación entre semanas

- [x] 5.1 Controles de semana anterior y siguiente, que reescriben `?semana=` con el lunes correspondiente
- [x] 5.2 Acción para volver a la semana actual, visible solo cuando no se la está viendo
- [x] 5.3 Mostrar el rango de fechas de la semana en el encabezado, e indicar cuándo es la semana en curso
- [x] 5.4 Verificar que al cambiar de semana se recargan los datos y que un refresh conserva la semana elegida

## 6. Verificación

- [x] 6.1 `npm run lint` y `npm run build` verdes, sin errores nuevos respecto de la línea de base (hoy: 14 problemas, 7 errores preexistentes)
- [x] 6.2 Recorrido end-to-end contra la base de test, con órdenes sembradas en varios días de una misma semana: se ven en la columna correcta, con su estado y responsable
- [x] 6.3 Verificar el borde de zona horaria: una orden el **lunes** y otra el **domingo** de la misma semana caen cada una en su columna y ninguna se corre de día (Decision 3, el riesgo más probable)
- [x] 6.4 Verificar que la columna de domingo aparece solo cuando ese domingo tiene órdenes, y no cuando no las tiene
- [x] 6.5 Verificar que un día sin órdenes se muestra vacío y que una semana entera sin órdenes muestra el aviso
- [x] 6.6 Verificar que el click en una tarjeta abre el detalle de esa orden, y que la tarjeta se puede activar con teclado
- [x] 6.7 Verificar anterior/siguiente/volver a hoy, que la URL refleja la semana, y que un refresh la conserva
