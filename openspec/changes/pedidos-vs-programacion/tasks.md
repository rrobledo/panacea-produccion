## 1. Backend groundwork (repo separado)

- [ ] 1.1 Confirmar con el backend cómo identifica hoy una fila de `/costos/programacion` a su producto (`producto_id` explícito vs. columnas por día) — bloqueante para 1.4
- [ ] 1.2 Crear tabla y endpoints CRUD de `clientes` (`nombre`, `contacto`)
- [ ] 1.3 Crear tabla y endpoints CRUD de `pedidos` + líneas (`cliente_id`, `fecha_pedido`, `fecha_entrega`, `estado`, líneas `producto_id`/`cantidad`)
- [ ] 1.4 Crear endpoint `GET /costos/disponibilidad_programacion?anio=&mes=&semana=` que devuelve, por producto, `programado`, `pedido`, `disponible`

## 2. Clientes (frontend)

- [ ] 2.1 Página de lista `src/pages/clientes/ClientesPage.jsx` (grid + búsqueda)
- [ ] 2.2 Formulario crear/editar cliente (`react-hook-form` + `zod`), siguiendo el patrón de `InsumoForm.jsx`
- [ ] 2.3 Eliminar cliente con confirmación
- [ ] 2.4 Picker de búsqueda de cliente reutilizable (mismo patrón que el picker de insumo en `CostosLinesEditor`)
- [ ] 2.5 Entrada de navegación "Clientes"

## 3. Pedidos (frontend)

- [ ] 3.1 Página de lista `src/pages/pedidos/PedidosPage.jsx` con filtros Fecha Desde/Hasta y Estado
- [ ] 3.2 Formulario de pedido: Cliente (picker de 2.4), Fecha de Pedido, Fecha de Entrega
- [ ] 3.3 Editor de líneas de pedido (staged, mismo patrón que `CostosLinesEditor`): Producto (picker de búsqueda) + Cantidad
- [ ] 3.4 Guardado combinado: POST del pedido + líneas staged en un solo flujo (ver patrón de `facturas-gastos` con `insumos` staged)
- [ ] 3.5 Chequeo de disponibilidad al agregar/editar una línea: llamar `disponibilidad_programacion` acotado a producto+semana de la Fecha de Entrega, mostrar advertencia no bloqueante si excede
- [ ] 3.6 Manejo de fallo del chequeo de disponibilidad: no bloquear la carga si la llamada falla
- [ ] 3.7 Edición de pedido existente: cambio de Estado (`pendiente`/`confirmado`/`cancelado`/`entregado`) y de líneas
- [ ] 3.8 Eliminar pedido con confirmación
- [ ] 3.9 Entrada de navegación "Pedidos"

## 4. Reporte Disponibilidad de Programación (frontend)

- [ ] 4.1 Nueva página en `src/pages/reportes` con filtros Año/Mes/Semana
- [ ] 4.2 Tabla Programado / Pedido / Disponible / Estado por producto, resaltando filas En Riesgo (Disponible negativo)
- [ ] 4.3 Drill-down: al abrir una fila En Riesgo, listar los pedidos/clientes que componen esa cantidad pedida
- [ ] 4.4 Entrada de navegación "Disponibilidad de Programación"

## 5. Validación

- [ ] 5.1 Probar el flujo completo en navegador: crear cliente → crear pedido con línea que excede lo programado → ver advertencia → guardar igual → verificar que aparece en el reporte como En Riesgo
- [ ] 5.2 Probar que una línea de pedido dentro de lo programado no dispara advertencia
- [ ] 5.3 Probar que el reporte refleja correctamente disponibilidad al filtrar por Año/Mes/Semana
