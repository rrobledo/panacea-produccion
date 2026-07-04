import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';
import { CATEGORIAS, UNIDADES_MEDIDA_PRODUCTO } from './constants';

const schema = z.object({
  codigo: z.string().min(1, 'Ingrese el código'),
  nombre: z.string().min(1, 'Ingrese el nombre'),
  categoria: z.string().min(1, 'Seleccione una categoría'),
  habilitado: z.boolean().default(true),
  is_producto: z.boolean().default(true),
  ref_id: z.coerce.number({ message: 'Ingrese el ID de referencia' }),
  precio_actual: z.coerce.number({ message: 'Ingrese el precio' }),
  utilidad: z.coerce.number({ message: 'Ingrese la utilidad' }).min(0).max(100),
  lote_produccion: z.coerce.number({ message: 'Ingrese el lote' }).min(1),
  unidad_medida: z.string().min(1, 'Seleccione la unidad'),
  tiempo_produccion: z.coerce.number({ message: 'Ingrese el tiempo' }).min(0),
  prioridad: z.coerce.number({ message: 'Ingrese la prioridad' }).min(0),
});

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

export const ProductoForm = ({ initialData, onSubmit, onCancel, saving, isEdit }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: '', nombre: '', categoria: '', habilitado: true, is_producto: true,
      ref_id: '', precio_actual: '', utilidad: '', lote_produccion: '',
      unidad_medida: '', tiempo_produccion: '', prioridad: '',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Información Básica</h3></div>
        <div className="card-body grid-3">
          <Field label="Código" required error={errors.codigo?.message}>
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
          <Field label="Categoría" required error={errors.categoria?.message}>
            <select {...register('categoria')} className={`form-select ${errors.categoria ? 'error' : ''}`}>
              <option value="">Seleccione categoría</option>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Toggle label="Habilitado" value={watch('habilitado')} onChange={v => setValue('habilitado', v)} />
          <Toggle label="Producto Final" value={watch('is_producto')} onChange={v => setValue('is_producto', v)} />
          <Field label="Id Referencia" required error={errors.ref_id?.message}>
            <input {...register('ref_id')} type="number" className={`form-input ${errors.ref_id ? 'error' : ''}`} placeholder="ID externo" />
          </Field>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Precios y Márgenes</h3></div>
        <div className="card-body grid-2">
          <Field label="Precio Actual" required error={errors.precio_actual?.message}>
            <input {...register('precio_actual')} type="number" step="0.01" className={`form-input ${errors.precio_actual ? 'error' : ''}`} placeholder="0.00" />
          </Field>
          <Field label="Utilidad (%)" required error={errors.utilidad?.message}>
            <input {...register('utilidad')} type="number" min="0" max="100" className={`form-input ${errors.utilidad ? 'error' : ''}`} placeholder="0" />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Producción</h3></div>
        <div className="card-body grid-4">
          <Field label="Lote Producción" required error={errors.lote_produccion?.message}>
            <input {...register('lote_produccion')} type="number" min="1" className={`form-input ${errors.lote_produccion ? 'error' : ''}`} placeholder="Cantidad" />
          </Field>
          <Field label="Unidad de Medida" required error={errors.unidad_medida?.message}>
            <select {...register('unidad_medida')} className={`form-select ${errors.unidad_medida ? 'error' : ''}`}>
              <option value="">Seleccione</option>
              {UNIDADES_MEDIDA_PRODUCTO.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Tiempo Producción (min)" required error={errors.tiempo_produccion?.message}>
            <input {...register('tiempo_produccion')} type="number" min="0" className={`form-input ${errors.tiempo_produccion ? 'error' : ''}`} placeholder="Minutos" />
          </Field>
          <Field label="Prioridad" required error={errors.prioridad?.message}>
            <input {...register('prioridad')} type="number" min="0" className={`form-input ${errors.prioridad ? 'error' : ''}`} placeholder="1-100" />
          </Field>
        </div>
        <div className="card-footer">
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              <X size={16} /> Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
