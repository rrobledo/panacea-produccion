import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Tabs } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { CATEGORIAS, UNIDADES_MEDIDA_PRODUCTO, NATURALEZAS, UNIDADES_BASE } from './constants';

const TABS = [
  {
    value: 'basica', label: 'Información Básica',
    fields: ['codigo', 'nombre', 'categoria', 'ref_id', 'lote_produccion', 'unidad_medida', 'tiempo_produccion', 'prioridad', 'producto_base_id', 'naturaleza', 'unidad_base', 'peso_unitario_g'],
  },
  { value: 'precios', label: 'Precios y Márgenes', fields: ['precio_actual', 'utilidad'] },
];

const schema = z.object({
  codigo: z.string().min(1, 'Ingrese el código'),
  nombre: z.string().min(1, 'Ingrese el nombre'),
  categoria: z.string().min(1, 'Seleccione una categoría'),
  habilitado: z.boolean().default(true),
  is_producto: z.boolean().default(true),
  // El backend guarda ref_id como texto (y lo castea a int al cruzar con
  // artículos), así que se valida numérico pero se envía como string.
  ref_id: z.preprocess(
    (v) => (v == null ? '' : String(v).trim()),
    z.string().regex(/^\d+$/, 'Ingrese el ID de referencia'),
  ),
  precio_actual: z.coerce.number({ message: 'Ingrese el precio' }),
  utilidad: z.coerce.number({ message: 'Ingrese la utilidad' }).min(0).max(100),
  lote_produccion: z.coerce.number({ message: 'Ingrese el lote' }).min(1),
  unidad_medida: z.string().min(1, 'Seleccione la unidad'),
  tiempo_produccion: z.coerce.number({ message: 'Ingrese el tiempo' }).min(0),
  prioridad: z.coerce.number({ message: 'Ingrese la prioridad' }).min(0),
  producto_base_id: z.union([z.number(), z.null()]).optional(),
  // Campos de artículo (masa-procesos-y-maquinaria). Van en el formulario aunque
  // el motor viejo todavía no los mire: si no se enviaran, el PUT los pisaría
  // con los valores por defecto del schema del backend y se perdería lo que
  // dejó el backfill.
  naturaleza: z.string().min(1, 'Seleccione la naturaleza'),
  unidad_base: z.string().min(1, 'Seleccione la unidad base'),
  peso_unitario_g: z.union([z.coerce.number().positive(), z.literal(''), z.null()]).optional(),
  vendible: z.boolean().default(true),
}).refine(
  // Un artículo contado por unidad necesita su peso: es la bisagra que traduce
  // kilos de masa en cantidad de bollos y al revés.
  (data) => data.unidad_base !== 'UN' || (data.peso_unitario_g !== '' && data.peso_unitario_g != null),
  { message: 'Ingrese el peso de una unidad', path: ['peso_unitario_g'] },
);

const Toggle = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <label style={{ display: 'flex', cursor: 'pointer' }}>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? 'var(--primary)' : 'var(--gray-300)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: 8, background: 'white',
          position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
    <span style={{ fontSize: 14 }}>{label}</span>
  </div>
);

export const ProductoForm = ({ initialData, onSubmit, isEdit }) => {
  const [activeTab, setActiveTab] = useState('basica');
  const { register, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: '', nombre: '', categoria: '', habilitado: true, is_producto: true,
      ref_id: '', precio_actual: '', utilidad: '', lote_produccion: '',
      unidad_medida: '', tiempo_produccion: '', prioridad: '',
      producto_base_id: null,
      naturaleza: 'TERMINADO', unidad_base: 'UN', peso_unitario_g: '', vendible: true,
      ...initialData,
    },
  });

  const selectProductoBase = (row) => {
    if (initialData?.id != null && row.id === initialData.id) {
      setError('producto_base_id', { message: 'Un producto no puede ser su propio producto base' });
      return;
    }
    clearErrors('producto_base_id');
    setValue('producto_base_id', row.id);
  };

  // Jump to the first tab that has a validation error so it isn't hidden from the user.
  const onInvalid = (formErrors) => {
    const firstErrorTab = TABS.find(t => t.fields.some(f => formErrors[f]));
    if (firstErrorTab) setActiveTab(firstErrorTab.value);
  };

  const tabErrorCount = (fields) => fields.filter(f => errors[f]).length;

  const unidadBase = watch('unidad_base');

  return (
    <form id="producto-form" onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <div className="card">
        <div className="card-header">
          <Tabs
            tabs={TABS.map(t => ({ value: t.value, label: t.label, count: tabErrorCount(t.fields) || undefined }))}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <div className="card-body" style={{ display: activeTab === 'basica' ? undefined : 'none' }}>
          <div className="form-row">
            <Field label="Código" required error={errors.codigo?.message} size="sm">
              <input
                {...register('codigo')}
                readOnly={isEdit}
                className={`form-input ${errors.codigo ? 'error' : ''}`}
                style={isEdit ? { background: 'var(--gray-50)' } : undefined}
                placeholder="Ej: PROD001"
              />
            </Field>
            <Field label="Nombre" required error={errors.nombre?.message}>
              <input {...register('nombre')} className={`form-input ${errors.nombre ? 'error' : ''}`} placeholder="Nombre del producto" />
            </Field>
            <Field label="Categoría" required error={errors.categoria?.message} size="md">
              <select {...register('categoria')} className={`form-select ${errors.categoria ? 'error' : ''}`}>
                <option value="">Seleccione categoría</option>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Toggle label="Habilitado" value={watch('habilitado')} onChange={v => setValue('habilitado', v)} />
            <Toggle label="Producto Final" value={watch('is_producto')} onChange={v => setValue('is_producto', v)} />
            <Field label="Id Referencia" required error={errors.ref_id?.message} size="sm">
              <input {...register('ref_id')} type="number" className={`form-input ${errors.ref_id ? 'error' : ''}`} placeholder="ID externo" />
            </Field>
          </div>

          <hr className="divider" />

          <div className="form-row">
            <Field
              label="Producto Base"
              error={errors.producto_base_id?.message}
              hint="Opcional — el producto intermedio (masa) del que se arma este producto"
            >
              <EntityPicker
                resource="/costos/productos"
                searchField="nombre"
                params={{ is_producto: false }}
                value={watch('producto_base_id')}
                onChange={(v) => { clearErrors('producto_base_id'); setValue('producto_base_id', v); }}
                onSelectRow={selectProductoBase}
                placeholder="Buscar producto intermedio…"
              />
            </Field>
          </div>

          <hr className="divider" />

          <div className="form-row">
            <Field label="Naturaleza" required error={errors.naturaleza?.message} size="md">
              <select {...register('naturaleza')} className={`form-select ${errors.naturaleza ? 'error' : ''}`}>
                {NATURALEZAS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </Field>
            <Field
              label="Unidad Base" required error={errors.unidad_base?.message} size="sm"
              hint="Cómo se cuenta el stock y se factura"
            >
              <select {...register('unidad_base')} className={`form-select ${errors.unidad_base ? 'error' : ''}`}>
                {UNIDADES_BASE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
            {unidadBase === 'UN' && (
              <Field
                label="Peso Unitario (g)" required error={errors.peso_unitario_g?.message} size="sm"
                hint="Cuánto pesa una unidad. Traduce unidades a kilos de masa."
              >
                <input
                  {...register('peso_unitario_g')} type="number" step="any" min="0"
                  className={`form-input ${errors.peso_unitario_g ? 'error' : ''}`}
                  placeholder="Ej: 110"
                />
              </Field>
            )}
            <Toggle label="Vendible" value={watch('vendible')} onChange={v => setValue('vendible', v)} />
          </div>

          <hr className="divider" />

          <div className="form-row">
            <Field label="Lote Producción" required error={errors.lote_produccion?.message} size="sm">
              <input {...register('lote_produccion')} type="number" min="1" className={`form-input ${errors.lote_produccion ? 'error' : ''}`} placeholder="Cantidad" />
            </Field>
            <Field label="Unidad de Medida" required error={errors.unidad_medida?.message} size="md">
              <select {...register('unidad_medida')} className={`form-select ${errors.unidad_medida ? 'error' : ''}`}>
                <option value="">Seleccione</option>
                {UNIDADES_MEDIDA_PRODUCTO.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
            <Field label="Tiempo Producción (min)" required error={errors.tiempo_produccion?.message} size="sm">
              <input {...register('tiempo_produccion')} type="number" min="0" className={`form-input ${errors.tiempo_produccion ? 'error' : ''}`} placeholder="Minutos" />
            </Field>
            <Field label="Prioridad" required error={errors.prioridad?.message} size="xs">
              <input {...register('prioridad')} type="number" min="0" className={`form-input ${errors.prioridad ? 'error' : ''}`} placeholder="1-100" />
            </Field>
          </div>
        </div>

        <div className="card-body form-row" style={{ display: activeTab === 'precios' ? undefined : 'none' }}>
          <Field label="Precio Actual" required error={errors.precio_actual?.message} size="sm">
            <input {...register('precio_actual')} type="number" step="0.01" className={`form-input ${errors.precio_actual ? 'error' : ''}`} placeholder="0.00" />
          </Field>
          <Field label="Utilidad (%)" required error={errors.utilidad?.message} size="xs">
            <input {...register('utilidad')} type="number" min="0" max="100" className={`form-input ${errors.utilidad ? 'error' : ''}`} placeholder="0" />
          </Field>
        </div>
      </div>
    </form>
  );
};
