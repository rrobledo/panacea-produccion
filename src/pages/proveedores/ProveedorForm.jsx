import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';

const schema = z.object({
  nombre: z.string().min(1, 'Ingrese el nombre'),
  cuit: z.string().min(1, 'Ingrese el CUIT'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
});

export const ProveedorForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', cuit: '', telefono: '', email: '', direccion: '', ...initialData },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Información del Proveedor</h3></div>
        <div className="card-body grid-2">
          {initialData?.id != null && (
            <Field label="Id">
              <input className="form-input" value={initialData.id} readOnly style={{ background: 'var(--gray-50)' }} />
            </Field>
          )}
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input {...register('nombre')} className={`form-input ${errors.nombre ? 'error' : ''}`} />
          </Field>
          <Field label="CUIT" required error={errors.cuit?.message}>
            <input {...register('cuit')} className={`form-input ${errors.cuit ? 'error' : ''}`} />
          </Field>
          <Field label="Teléfono" error={errors.telefono?.message}>
            <input {...register('telefono')} className="form-input" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} />
          </Field>
          <Field label="Dirección" error={errors.direccion?.message} span={2}>
            <input {...register('direccion')} className="form-input" />
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
