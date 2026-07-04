import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';
import { UNIDADES_MEDIDA } from './constants';

const schema = z.object({
  nombre: z.string().min(1, 'Ingrese el nombre del insumo'),
  cantidad: z.coerce.number({ message: 'Ingrese la cantidad' }),
  unidad_medida: z.string().min(1, 'Seleccione la unidad'),
  precio: z.coerce.number({ message: 'Ingrese el precio' }),
});

export const InsumoForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', cantidad: '', unidad_medida: '', precio: '', ...initialData },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Información del Insumo</h3></div>
        <div className="card-body form-row">
          {initialData?.id != null && (
            <Field label="Id" size="xs">
              <input className="form-input" value={initialData.id} readOnly style={{ background: 'var(--gray-50)' }} />
            </Field>
          )}
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input {...register('nombre')} className={`form-input ${errors.nombre ? 'error' : ''}`} placeholder="Nombre del insumo" />
          </Field>
          <Field label="Cantidad" required error={errors.cantidad?.message} size="sm">
            <input {...register('cantidad')} type="number" step="any" className={`form-input ${errors.cantidad ? 'error' : ''}`} />
          </Field>
          <Field label="Unidad de Medida" required error={errors.unidad_medida?.message} size="md">
            <select {...register('unidad_medida')} className={`form-select ${errors.unidad_medida ? 'error' : ''}`}>
              <option value="">Seleccione unidad</option>
              {UNIDADES_MEDIDA.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Precio" required error={errors.precio?.message} size="sm">
            <input {...register('precio')} type="number" step="0.01" className={`form-input ${errors.precio ? 'error' : ''}`} placeholder="0.00" />
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
