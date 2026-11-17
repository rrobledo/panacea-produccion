## ADDED Requirements

### Requirement: Listar artículos de sucursales con su relación
El sistema SHALL mostrar una pantalla "Referencias de Sucursales" que liste los artículos activos de `articulos_final` (`activo = 1`), tomados de `GET /costos/referencias-articulos`, con las columnas Id Artículo, Nombre, Categoría, Sucursal, Precio, Productos vinculados (nombre y cantidad de cada uno) y Estado. Cada artículo SHALL aparecer una sola vez, aunque tenga varias relaciones.

#### Scenario: Artículo con una sola relación
- **WHEN** el artículo de caja 1050 "Medialuna" tiene una fila en `costos_productosref` con `ref_id = '1050'`, `producto_id` = Medialuna y `unidad_conversion = 1`
- **THEN** la fila del artículo 1050 SHALL mostrar "Medialuna × 1" en Productos vinculados y Estado "Vinculado"

#### Scenario: Promo con varios productos
- **WHEN** el artículo de caja 1200 "Promo docena surtida" tiene dos filas en `costos_productosref`: Medialuna con cantidad 6 y Vigilante con cantidad 6
- **THEN** el artículo 1200 SHALL aparecer en una sola fila con "Medialuna × 6, Vigilante × 6" en Productos vinculados

#### Scenario: Artículo inactivo
- **WHEN** un artículo de `articulos_final` tiene `activo` distinto de 1
- **THEN** el sistema SHALL omitirlo del listado

#### Scenario: Sucursal derivada del id
- **WHEN** se lista un artículo con `idarticulo < 2000`
- **THEN** su Sucursal SHALL mostrarse como "Villa Allende"; si `2000 <= idarticulo < 4000`, como "Carlos Paz"; y si `idarticulo >= 4000`, como "Córdoba"

### Requirement: Filtrar artículos pendientes de relación
El sistema SHALL ofrecer un filtro de Estado con las opciones Pendientes, Vinculados y Todos, y SHALL abrir la pantalla con Pendientes seleccionado. Un artículo SHALL considerarse pendiente cuando no tiene ninguna fila en `costos_productosref` cuyo `ref_id` corresponda a su `idarticulo`. El sistema SHALL ofrecer también filtro por Sucursal, filtro por Categoría de caja y búsqueda por nombre, combinables con el de Estado.

#### Scenario: Abrir la pantalla
- **WHEN** un usuario autenticado abre "Referencias de Sucursales"
- **THEN** el sistema SHALL mostrar sólo los artículos activos sin relación

#### Scenario: Ver los vinculados
- **WHEN** el usuario elige Estado "Vinculados"
- **THEN** el sistema SHALL mostrar sólo los artículos activos con al menos una relación

#### Scenario: Combinar filtros
- **WHEN** el usuario elige Estado "Pendientes" y Sucursal "Carlos Paz"
- **THEN** el sistema SHALL mostrar sólo los artículos activos con `2000 <= idarticulo < 4000` que no tienen relación

#### Scenario: Artículo recién vinculado con el filtro Pendientes activo
- **WHEN** el filtro es "Pendientes" y el usuario guarda una relación para uno de los artículos listados
- **THEN** ese artículo SHALL salir del listado al recargarse, sin que el usuario tenga que cambiar el filtro

### Requirement: Mostrar el avance de la vinculación
El sistema SHALL mostrar cuántos artículos activos están vinculados sobre el total de artículos activos, respetando el filtro de Sucursal pero no los de Estado, Categoría ni búsqueda.

#### Scenario: Indicador de avance
- **WHEN** hay 300 artículos activos y 240 tienen al menos una relación
- **THEN** el sistema SHALL mostrar "240 de 300 vinculados" (80 %) y 60 pendientes

### Requirement: Editar la relación de un artículo
El sistema SHALL permitir, desde cada fila del listado, abrir un editor de la relación del artículo, con una línea por producto fabricado vinculado. Cada línea SHALL tener un Producto, elegido con un buscador sobre los productos habilitados de `costos_productos`, y una Cantidad entera mayor o igual a 1, que se guarda en `unidad_conversion`. El usuario SHALL poder agregar líneas, cambiar la cantidad o el producto de una línea y quitar líneas. Al guardar, el sistema SHALL enviar el conjunto completo de líneas a `PUT /costos/referencias-articulos/{idarticulo}`.

#### Scenario: Vincular un artículo pendiente
- **WHEN** el usuario abre el editor del artículo pendiente 1050, agrega la línea Medialuna con cantidad 1 y guarda
- **THEN** el sistema SHALL crear una fila en `costos_productosref` con `ref_id = '1050'`, el `producto_id` de Medialuna y `unidad_conversion = 1`, mostrar una confirmación de éxito y recargar el listado

#### Scenario: Cargar una promo
- **WHEN** el usuario abre el editor del artículo 1200, agrega Medialuna con cantidad 6 y Vigilante con cantidad 6, y guarda
- **THEN** el sistema SHALL dejar exactamente esas dos filas en `costos_productosref` para `ref_id = '1200'`

#### Scenario: Corregir una cantidad
- **WHEN** el artículo 1200 tiene Medialuna × 6 y el usuario la cambia a 4 y guarda
- **THEN** la fila de Medialuna para `ref_id = '1200'` SHALL quedar con `unidad_conversion = 4` y el resto de las líneas sin cambios

#### Scenario: Quitar todas las líneas
- **WHEN** el usuario quita todas las líneas de un artículo vinculado y confirma el guardado
- **THEN** el sistema SHALL borrar todas sus filas de `costos_productosref` y el artículo SHALL volver a figurar como pendiente

#### Scenario: Cantidad inválida
- **WHEN** el usuario deja una línea con cantidad vacía, 0, negativa o con decimales
- **THEN** el sistema SHALL marcar el error sobre esa línea y no SHALL enviar el guardado

#### Scenario: Producto repetido
- **WHEN** el usuario intenta tener dos líneas con el mismo producto en el mismo artículo
- **THEN** el sistema SHALL marcar el error sobre la línea repetida y no SHALL enviar el guardado

### Requirement: Guardado atómico de la relación en el backend
`PUT /costos/referencias-articulos/{idarticulo}` SHALL recibir la lista completa de líneas (`producto_id`, `unidad_conversion`) y SHALL reemplazar en una sola transacción todas las filas de `costos_productosref` cuyo `ref_id` corresponde a ese artículo, guardando `ref_id` como el texto del `idarticulo`. Si alguna línea es inválida, el backend SHALL responder 422 y SHALL dejar las filas existentes sin cambios.

#### Scenario: Reemplazo exitoso
- **WHEN** el artículo 1200 tiene las filas Medialuna × 6 y Vigilante × 6, y llega un PUT con Medialuna × 4 y Cañoncito × 2
- **THEN** después del PUT `costos_productosref` SHALL tener exactamente Medialuna × 4 y Cañoncito × 2 para `ref_id = '1200'`, y la respuesta SHALL traer el artículo con esas relaciones

#### Scenario: Producto inexistente
- **WHEN** llega un PUT con un `producto_id` que no existe en `costos_productos`
- **THEN** el backend SHALL responder 422 con un mensaje que identifica ese producto, y las filas previas del artículo SHALL quedar intactas

#### Scenario: Artículo inexistente o inactivo
- **WHEN** llega un PUT para un `idarticulo` que no está activo en `articulos_final`
- **THEN** el backend SHALL responder 404 y no SHALL modificar `costos_productosref`

#### Scenario: Lista vacía
- **WHEN** llega un PUT con la lista de líneas vacía
- **THEN** el backend SHALL borrar todas las filas de ese artículo y responder con el artículo en estado pendiente

### Requirement: Tolerar referencias no numéricas existentes
El listado SHALL funcionar aunque `costos_productosref` tenga filas con `ref_id` nulo o no numérico. Esas filas SHALL ignorarse al calcular relaciones y estado, sin provocar un error.

#### Scenario: Fila con ref_id inválido
- **WHEN** `costos_productosref` tiene una fila con `ref_id = 'ABC'`
- **THEN** `GET /costos/referencias-articulos` SHALL responder normalmente y esa fila no SHALL asociarse a ningún artículo
