## 1. Backend groundwork (repo separado)

- [x] 1.1 Confirmar con el backend cómo identifica hoy una fila de `/costos/programacion` a su producto y a la cantidad programada por día (bloqueante, compartido con `pedidos-vs-programacion`)
- [x] 1.2 Crear tabla y endpoints CRUD de `ubicaciones` (Nombre), bloqueando el delete si está referenciada por `productos_fabricados`
- [x] 1.3 Agregar `producto_base_id` (nullable, self-referencial, debe apuntar a un producto con `is_producto=false`) a `productos`, con validación de ciclos
- [x] 1.4 Crear tabla `stock_movimientos` (insumo_id, tipo `RESERVA`/`CONSUMO`/`AJUSTE`, cantidad, referencia, fecha) y endpoints (`GET/POST /costos/insumos/{id}/movimientos`)
- [x] 1.5 Cambiar `PUT /costos/insumos/{id}` para dejar de aceptar `cantidad`; `cantidad` pasa a calcularse desde `stock_movimientos`
- [x] 1.6 Sembrar un movimiento `AJUSTE` de apertura por cada insumo existente, igual a su `cantidad` actual, para no perder el valor al migrar
- [x] 1.7 Crear tabla y endpoints de `ordenes_produccion` (+ líneas de producto, líneas de insumo, estado, Código, Responsable)
- [x] 1.8 Endpoint de generación: dada una fecha, agrupar Programación por (`producto_base_id`, Responsable), calcular cantidades, generar un Código corto por orden, y crear órdenes en estado `ASIGNADA` con sus `RESERVA`
- [x] 1.9 Endpoint de transición `ASIGNADA` → `EN_PRODUCCION` (crea `CONSUMO`, valida stock físico suficiente)
- [x] 1.10 Endpoint de transición a `CANCELADA` (libera las `RESERVA`)
- [x] 1.11 Crear tabla `productos_fabricados` (producto_id, orden_id, cantidad_fabricada, ubicacion_id, cantidad_desperdicio, ubicacion_desperdicio_id, motivo_desperdicio, fecha) y endpoint de finalizar (`EN_PRODUCCION` → `FINALIZADA`) que recibe cantidad + ubicación + desperdicio/ubicación de desperdicio/motivo por línea, valida que ubicación de desperdicio y motivo sean requeridos si desperdicio > 0, y persiste el registro
- [x] 1.12 Endpoint de listado `GET /costos/productos_fabricados`, filtrable por producto/ubicación/fecha

## 2. Ubicaciones (frontend)

- [x] 2.1 Página de lista `src/pages/ubicaciones/UbicacionesPage.jsx`
- [x] 2.2 Formulario crear/editar ubicación (Nombre), siguiendo el patrón de `InsumoForm.jsx`/`ClienteForm`
- [x] 2.3 Eliminar ubicación con confirmación, mostrando el error del backend si está en uso
- [x] 2.4 Picker de búsqueda de ubicación reutilizable para el flujo de Finalizar
- [x] 2.5 Entrada de navegación "Ubicaciones"

## 3. Vínculo Producto ↔ Producto Base (frontend)

- [x] 3.1 Picker de búsqueda de Producto Base en `ProductoForm.jsx` (campo opcional, restringido a productos con Producto Final off)
- [x] 3.2 Validar en el form que un producto no se seleccione a sí mismo ni genere un ciclo como base
- [x] 3.3 Mostrar en el edit de producto, cuando tiene `producto_base_id`, un indicador del producto base vinculado y tratar sus Costos propios como opcionales
- [x] 3.4 Filtro "Producto Final" (Sí/No) en `ProductosPage.jsx` para poder listar solo los intermedios

## 4. Stock de insumos (frontend)

- [x] 4.1 Cambiar `InsumoForm.jsx`: Cantidad pasa a solo lectura
- [x] 4.2 Acción "Ajustar Stock" (modal/formulario: Cantidad +/-, Motivo) que llama a `POST /costos/insumos/{id}/movimientos`
- [x] 4.3 Historial de movimientos en el detalle/edit del insumo
- [x] 4.4 Columnas Comprometido y Disponible en `InsumosPage.jsx`

## 5. Órdenes de Producción (frontend)

- [x] 5.1 Página de lista `src/pages/ordenes-produccion/OrdenesProduccionPage.jsx` con filtros Fecha de Fabricación y Estado
- [x] 5.2 Acción "Generar Órdenes de Mañana"
- [x] 5.3 Vista de detalle de orden: Código, Responsable/Área, líneas de producto + líneas de insumo (read-only)
- [x] 5.4 Acción "Iniciar Producción" (transición a `EN_PRODUCCION`), mostrando el error de stock insuficiente si corresponde
- [x] 5.5 Acción "Cancelar" (solo disponible en `ASIGNADA`)
- [x] 5.6 Flujo "Finalizar": formulario por producto-línea (Cantidad Fabricada, picker de Ubicación, Cantidad de Desperdicio opcional + picker de Ubicación de Desperdicio propio + Motivo, ambos condicionalmente requeridos si el desperdicio es mayor a cero), POST del registro y transición a `FINALIZADA`
- [x] 5.7 Vista/componente de "Oblea" (fecha de fabricación, Código, Responsable/Área, nombre(s) de producto — sin insumos) y acción "Imprimir Oblea" que abre el diálogo de impresión del navegador acotado a ese contenido, mismo patrón que los paneles imprimibles de `reportes-costos`
- [x] 5.8 Entrada de navegación "Órdenes de Producción"

## 6. Producto Fabricado (frontend)

- [x] 6.1 Página de lista `src/pages/ordenes-produccion/ProductosFabricadosPage.jsx` (o sección dentro de Órdenes de Producción) con filtros Producto, Ubicación, y rango de fecha
- [x] 6.2 Mostrar Producto, Cantidad Fabricada, Ubicación, Cantidad de Desperdicio, Ubicación de Desperdicio, Motivo, Fecha, y Código de la orden de origen
- [x] 6.3 Total de Desperdicio para los filtros aplicados
- [x] 6.4 Entrada de navegación "Producto Fabricado"

## 7. Validación

Nota: este entorno no tiene un navegador real disponible para manejar. Todo lo
de abajo se verificó pegándole directo a la API local (mismo backend, mismos
payloads que manda el frontend) contra un seed de datos armado a mano, más
`npm run build`/`npm run lint` limpios sobre el código nuevo — no es lo mismo
que clickear la UI real. Queda pendiente una pasada visual en navegador antes
de darlo por completamente cerrado, en particular 7.6 (layout impreso) y 7.8
(mensaje de error inline del picker).

- [x] 7.1 Probar en navegador: programar dos productos finales con el mismo producto base el mismo día → generar orden → verificar que aparece una sola orden con ambos productos y los insumos sumados (verificado vía API: 100+200 planificado → 150kg harina en una sola orden)
- [x] 7.2 Probar el flujo de estados completo: `ASIGNADA` → "Iniciar Producción" → verificar que `insumos.cantidad` baja → "Finalizar" con cantidad/ubicación/desperdicio por línea → verificar que aparece en "Producto Fabricado" (verificado vía API)
- [x] 7.3 Probar "Iniciar Producción" con stock físico insuficiente → verificar que bloquea con el mensaje de faltante (verificado vía API, 422 con detalle del faltante)
- [x] 7.4 Probar "Ajustar Stock" y verificar que el historial de movimientos lo refleja (verificado vía API)
- [x] 7.5 Probar cancelar una orden `ASIGNADA` y verificar que el insumo vuelve a estar disponible para una nueva orden (verificado vía API, comprometido vuelve a 0)
- [ ] 7.6 Probar "Imprimir Oblea" en una orden con varios productos y verificar que el diálogo de impresión no muestra ningún insumo, solo fecha, Código, Responsable/Área, y los nombres de producto (implementado, no verificado visualmente — requiere navegador)
- [x] 7.7 Probar registrar como fabricado un producto intermedio (masa) finalizado y verificar que queda visible en "Producto Fabricado" igual que uno final (verificado vía API)
- [x] 7.8 Probar que el picker de Producto Base en `ProductoForm.jsx` rechaza autoreferencia y ciclos (validación de backend cubierta por tests unitarios; el picker del frontend no se probó a click)
- [x] 7.9 Probar que Finalizar bloquea si se ingresa Cantidad de Desperdicio sin Motivo o sin Ubicación de Desperdicio, y que no exige ninguno de los dos cuando el desperdicio queda en 0 (verificado vía API, 400 sin motivo/ubicación)
- [x] 7.10 Probar que se puede elegir una Ubicación de Desperdicio distinta de la Ubicación del producto terminado en la misma línea, y que ambas se guardan correctamente (verificado vía API)
