import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Field } from '../../components/ui';
import { TIPOS_MAQUINA, UNIDADES_CAPACIDAD, ESTADOS_MAQUINA, AREAS } from './constants';

const schema = z.object({
  codigo: z.string().min(1, 'Ingrese el código'),
  nombre: z.string().min(1, 'Ingrese el nombre'),
  tipo: z.string().min(1, 'Seleccione el tipo'),
  capacidad: z.coerce.number({ message: 'Ingrese la capacidad' }).positive('Tiene que ser mayor que cero'),
  capacidad_unidad: z.string().min(1, 'Seleccione la unidad'),
  minutos_setup: z.coerce.number().min(0).default(0),
  minutos_limpieza: z.coerce.number().min(0).default(0),
  tarifa_hora: z.coerce.number().min(0).default(0),
  area: z.string().min(1),
  estado: z.string().min(1),
  turno_desde: z.string().optional().nullable(),
  turno_hasta: z.string().optional().nullable(),
});

export const MaquinaForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: '', nombre: '', tipo: 'AMASADORA', capacidad: '', capacidad_unidad: 'KG',
      minutos_setup: 0, minutos_limpieza: 0, tarifa_hora: 0, area: 'Panaderia', estado: 'ACTIVA',
      turno_desde: '04:00', turno_hasta: '10:00',
      ...initialData,
    },
  });

  const unidad = useWatch({ control, name: 'capacidad_unidad' });
  const concurrente = UNIDADES_CAPACIDAD.find(u => u.value === unidad)?.concurrente;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Información de la máquina</h3></div>
        <div className="card-body form-row">
          <Field label="Código" required error={errors.codigo?.message} size="sm">
            <input {...register('codigo')} className={`form-input ${errors.codigo ? 'error' : ''}`} placeholder="AM-01" />
          </Field>
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input {...register('nombre')} className={`form-input ${errors.nombre ? 'error' : ''}`} placeholder="Amasadora espiral #1" />
          </Field>
          <Field label="Tipo" required error={errors.tipo?.message} size="md">
            <select {...register('tipo')} className="form-select">
              {TIPOS_MAQUINA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Capacidad" required error={errors.capacidad?.message} size="sm">
            <input {...register('capacidad')} type="number" step="any" className={`form-input ${errors.capacidad ? 'error' : ''}`} />
          </Field>
          <Field
            label="Unidad de capacidad" required size="md"
            hint={concurrente
              ? 'Concurrente: atiende varias órdenes a la vez hasta su capacidad'
              : 'Exclusiva: una orden por vez, la capacidad se cuenta en horas'}
          >
            <select {...register('capacidad_unidad')} className="form-select">
              {UNIDADES_CAPACIDAD.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Minutos de setup" hint="Puesta a punto o precalentado" size="xs">
            <input {...register('minutos_setup')} type="number" min="0" className="form-input" />
          </Field>
          <Field label="Minutos de limpieza" hint="Después de cada uso" size="xs">
            <input {...register('minutos_limpieza')} type="number" min="0" className="form-input" />
          </Field>
          <Field label="Tarifa por hora" hint="Para el costeo por rama" size="sm">
            <input {...register('tarifa_hora')} type="number" step="any" min="0" className="form-input" />
          </Field>
          <Field label="Área" required size="sm">
            <select {...register('area')} className="form-select">
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field
            label="Estado" required size="sm"
            hint="Sacar una máquina de circulación es cambiar esto, no editar recetas"
          >
            <select {...register('estado')} className="form-select">
              {ESTADOS_MAQUINA.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </Field>
          <Field label="Turno desde" size="xs">
            <input {...register('turno_desde')} className="form-input" placeholder="04:00" />
          </Field>
          <Field label="Turno hasta" size="xs">
            <input {...register('turno_hasta')} className="form-input" placeholder="10:00" />
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
