import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, AlertTriangle } from 'lucide-react';
import { Field } from '../../components/ui';
import { ProcesoLineasEditor } from './ProcesoLineasEditor';
import { ProcesoOperacionesEditor } from './ProcesoOperacionesEditor';
import { TIPOS_PROCESO, UNIDADES_LOTE, ROLES_SALIDA } from './constants';

const schema = z.object({
  codigo: z.string().min(1, 'Ingrese el código'),
  nombre: z.string().min(1, 'Ingrese el nombre'),
  tipo: z.string().min(1, 'Seleccione el tipo'),
  responsable: z.string().min(1, 'Seleccione el responsable'),
  lote_referencia: z.coerce.number({ message: 'Ingrese el lote' }).positive('El lote tiene que ser mayor que cero'),
  lote_unidad: z.string().min(1, 'Seleccione la unidad'),
  lote_minimo: z.union([z.coerce.number(), z.literal('')]).optional(),
  lote_multiplo: z.union([z.coerce.number(), z.literal('')]).optional(),
  minutos_setup: z.coerce.number().min(0).default(0),
});

const RESPONSABLES = ['Panaderia', 'Pasteleria', 'Pastas', 'Galletas', 'Todos'];

// La suma de las ramas contra el lote: se muestra mientras se edita, no al
// guardar. Es la validación que hace evidente un gramaje mal cargado, y por eso
// avisa en vez de bloquear — las salidas quedan en cero hasta que el
// relevamiento de F3 carga el gramaje.
const resumenDeRamas = (lineas, loteReferencia, loteUnidad) => {
  const salidas = lineas.filter(l => ROLES_SALIDA.includes(l.rol));
  if (!salidas.length || !loteReferencia) return null;
  const consumido = salidas.reduce((total, l) => total + Number(l.cantidad || 0), 0);
  if (!consumido) return null;
  const diferencia = Number(loteReferencia) - consumido;
  if (Math.abs(diferencia) < 0.001) return { ok: true, texto: `Las ramas suman exactamente el lote (${consumido} ${loteUnidad})` };
  return {
    ok: false,
    texto: `Las ramas suman ${consumido} ${loteUnidad} contra un lote de ${loteReferencia} ${loteUnidad}: `
      + `${diferencia < 0 ? 'sobran' : 'faltan'} ${Math.abs(diferencia).toFixed(3).replace(/\.?0+$/, '')} ${loteUnidad}`,
  };
};

export const ProcesoForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const [lineas, setLineas] = useState(initialData?.lineas ?? []);
  const [operaciones, setOperaciones] = useState(initialData?.operaciones ?? []);
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: '', nombre: '', tipo: 'ELABORACION', responsable: 'Panaderia',
      lote_referencia: '', lote_unidad: 'KG', lote_minimo: '', lote_multiplo: '', minutos_setup: 0,
      ...initialData,
    },
  });

  // `useWatch` en vez de `watch()`: el segundo devuelve una función que el
  // compilador de React no puede memoizar y termina saltando el componente.
  const loteReferencia = useWatch({ control, name: 'lote_referencia' });
  const loteUnidad = useWatch({ control, name: 'lote_unidad' });
  const tipo = useWatch({ control, name: 'tipo' });
  const resumen = resumenDeRamas(lineas, loteReferencia, loteUnidad);
  const hint = TIPOS_PROCESO.find(t => t.value === tipo)?.hint;

  const enviar = (values) => onSubmit({
    ...values,
    lote_minimo: values.lote_minimo === '' ? null : values.lote_minimo,
    lote_multiplo: values.lote_multiplo === '' ? null : values.lote_multiplo,
    lineas: lineas.map((l, orden) => ({
      rol: l.rol,
      insumo_id: l.insumo_id ?? null,
      producto_id: l.producto_id ?? null,
      cantidad: Number(l.cantidad || 0),
      unidad: l.unidad || null,
      gramaje_g: l.gramaje_g === '' || l.gramaje_g == null ? null : Number(l.gramaje_g),
      merma_pct: Number(l.merma_pct || 0),
      rendimiento_pct: Number(l.rendimiento_pct ?? 100),
      minutos_directos: Number(l.minutos_directos || 0),
      minutos_maquina: Number(l.minutos_maquina || 0),
      criterio_reparto: l.criterio_reparto || 'PESO',
      orden,
    })),
    operaciones: operaciones.map((o, orden) => ({
      orden,
      nombre: o.nombre || `Etapa ${orden + 1}`,
      maquina_tipo: o.maquina_tipo,
      capacidad_minima: o.capacidad_minima === '' || o.capacidad_minima == null ? null : Number(o.capacidad_minima),
      minutos_por_bacha: Number(o.minutos_por_bacha || 0),
      minutos_por_unidad: Number(o.minutos_por_unidad || 0),
      requiere_operario: !!o.requiere_operario,
      puede_solapar: !!o.puede_solapar,
    })),
  });

  return (
    <form onSubmit={handleSubmit(enviar)}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3 className="card-title">Información del proceso</h3></div>
        <div className="card-body form-row">
          <Field label="Código" required error={errors.codigo?.message} size="sm">
            <input {...register('codigo')} className={`form-input ${errors.codigo ? 'error' : ''}`} placeholder="ELAB-FRANCES" />
          </Field>
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input {...register('nombre')} className={`form-input ${errors.nombre ? 'error' : ''}`} placeholder="Masa de francés" />
          </Field>
          <Field label="Tipo" required error={errors.tipo?.message} hint={hint} size="md">
            <select {...register('tipo')} className={`form-select ${errors.tipo ? 'error' : ''}`}>
              {TIPOS_PROCESO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Responsable" required error={errors.responsable?.message} size="sm">
            <select {...register('responsable')} className="form-select">
              {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field
            label="Lote de referencia" required error={errors.lote_referencia?.message} size="sm"
            hint="Todas las líneas se expresan por este lote"
          >
            <input {...register('lote_referencia')} type="number" step="any" className={`form-input ${errors.lote_referencia ? 'error' : ''}`} />
          </Field>
          <Field label="Unidad del lote" required size="xs">
            <select {...register('lote_unidad')} className="form-select">
              {UNIDADES_LOTE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Lote mínimo" hint="Por debajo de esto no se amasa" size="sm">
            <input {...register('lote_minimo')} type="number" step="any" className="form-input" />
          </Field>
          <Field label="Múltiplo de lote" hint="El requerimiento se redondea a este múltiplo" size="sm">
            <input {...register('lote_multiplo')} type="number" step="any" className="form-input" />
          </Field>
          <Field label="Minutos de setup" hint="Tiempo fijo por lote" size="xs">
            <input {...register('minutos_setup')} type="number" className="form-input" />
          </Field>
        </div>
      </div>

      <ProcesoLineasEditor lineas={lineas} onChange={setLineas} disabled={saving} />

      <ProcesoOperacionesEditor operaciones={operaciones} onChange={setOperaciones} disabled={saving} />

      {resumen && (
        <div
          className="card"
          style={{ marginTop: 16, borderLeft: `3px solid ${resumen.ok ? 'var(--success, #1B5A44)' : 'var(--warning, #B26B15)'}` }}
        >
          <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!resumen.ok && <AlertTriangle size={16} />}
            <span>{resumen.texto}</span>
          </div>
        </div>
      )}

      {initialData?.advertencias?.length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--warning, #B26B15)' }}>
          <div className="card-header"><h3 className="card-title">Pendientes de este proceso</h3></div>
          <div className="card-body">
            <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
              {initialData.advertencias.map((aviso, i) => <li key={i}>{aviso}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
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
