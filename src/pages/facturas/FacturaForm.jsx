import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';
import { EntityPicker } from '../../components/form/EntityPicker';
import { ImageField } from '../../components/form/ImageField';
import { CATEGORIAS_GASTO, TIPOS_PAGO, CAJAS } from './constants';

const schema = z.object({
  proveedor: z.union([z.string(), z.number()]).nullable().refine(v => v !== null && v !== '', 'Seleccione un proveedor'),
  numero: z.string().min(1, 'Ingrese el número de comprobante'),
  fecha_emision: z.string().min(1, 'Ingrese la fecha'),
  fecha_vencimiento: z.string().optional().or(z.literal('')),
  importe_total: z.coerce.number({ message: 'Ingrese el importe' }),
  categoria: z.string().min(1, 'Seleccione una categoría'),
  tipo_pago: z.string().min(1),
  caja: z.string().min(1),
  observaciones: z.string().optional(),
  image: z.string().nullable().optional(),
  image2: z.string().nullable().optional(),
});

export const FacturaForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedor: null, numero: '', fecha_emision: new Date().toISOString().slice(0, 10),
      fecha_vencimiento: '', importe_total: '', categoria: '',
      tipo_pago: 'TRANSFERENCIA', caja: 'VA', observaciones: '',
      image: null, image2: null,
      ...initialData,
    },
  });

  const submit = (data) => onSubmit({ ...data, tipo_movimiento: 'FACTURA' });

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Factura / Gasto</h3></div>
        <div className="card-body grid-3">
          <Field label="Proveedor" required error={errors.proveedor?.message} span={2}>
            <Controller
              name="proveedor"
              control={control}
              render={({ field }) => (
                <EntityPicker resource="/costos/proveedores" searchField="nombre" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="Número Comprobante" required error={errors.numero?.message}>
            <input {...register('numero')} className={`form-input ${errors.numero ? 'error' : ''}`} />
          </Field>

          <Field label="Fecha" required error={errors.fecha_emision?.message}>
            <input {...register('fecha_emision')} type="date" className={`form-input ${errors.fecha_emision ? 'error' : ''}`} />
          </Field>
          <Field label="Fecha Vencimiento" error={errors.fecha_vencimiento?.message}>
            <input {...register('fecha_vencimiento')} type="date" className="form-input" />
          </Field>
          <Field label="Importe Total" required error={errors.importe_total?.message}>
            <input {...register('importe_total')} type="number" step="0.01" className={`form-input ${errors.importe_total ? 'error' : ''}`} placeholder="0.00" />
          </Field>

          <Field label="Categoría" required error={errors.categoria?.message}>
            <select {...register('categoria')} className={`form-select ${errors.categoria ? 'error' : ''}`}>
              <option value="">Seleccione categoría</option>
              {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Tipo de Pago" error={errors.tipo_pago?.message}>
            <select {...register('tipo_pago')} className="form-select">
              {TIPOS_PAGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Caja" error={errors.caja?.message}>
            <select {...register('caja')} className="form-select">
              {CAJAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Observaciones" error={errors.observaciones?.message} span={3}>
            <textarea {...register('observaciones')} className="form-textarea" rows={3} />
          </Field>
        </div>

        <div className="card-body grid-2" style={{ borderTop: '1px solid var(--gray-100)' }}>
          <Controller name="image" control={control} render={({ field }) => (
            <ImageField label="Imagen 1" value={field.value} onChange={field.onChange} />
          )} />
          <Controller name="image2" control={control} render={({ field }) => (
            <ImageField label="Imagen 2" value={field.value} onChange={field.onChange} />
          )} />
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
