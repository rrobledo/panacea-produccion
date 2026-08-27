import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';

const schema = z.object({
  nombre: z.string().min(1, 'Ingrese el nombre de la ubicación'),
});

export const UbicacionForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', ...initialData },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Información de la Ubicación</h3></div>
        <div className="card-body form-row">
          {initialData?.id != null && (
            <Field label="Id" size="xs">
              <input className="form-input" value={initialData.id} readOnly style={{ background: 'var(--gray-50)' }} />
            </Field>
          )}
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input
              {...register('nombre')}
              className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Ej: Depósito Central - Estante 3"
            />
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
