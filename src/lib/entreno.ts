import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { EJERCICIOS, type EjercicioBanco } from '../data/ejercicios';
import { db, type EjercicioSesion, type Serie, type Sesion } from './db';

export const volumenSerie = (s: Serie) => (s.reps ?? 0) * (s.peso ?? 0);
export const volumenEjercicio = (e: EjercicioSesion) => e.series.reduce((t, s) => t + volumenSerie(s), 0);
export const volumenSesion = (s: Sesion) => s.ejercicios.reduce((t, e) => t + volumenEjercicio(e), 0);

/** Banco completo: ejercicios del archivo de datos + los que agregó la persona. */
export function useBanco(): EjercicioBanco[] {
  const propios = useLiveQuery(() => db.ejerciciosPropios.toArray(), []);
  return useMemo(() => [...EJERCICIOS, ...(propios ?? []).map((p) => ({ ...p, id: `propio-${p.id}` }))], [propios]);
}

export interface RecordEjercicio {
  ejercicioId: string;
  nombre: string;
  grupo: string;
  pesoMax: number;
  fechaMax: string;
  ultimaVez: string;
  evolucion: { fecha: string; peso: number }[]; // peso máximo de cada sesión
}

/** Récords por ejercicio a partir de las sesiones (orden cronológico). */
export function calcularRecords(sesiones: Sesion[]): RecordEjercicio[] {
  const m = new Map<string, RecordEjercicio>();
  for (const s of [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    for (const e of s.ejercicios) {
      const max = Math.max(0, ...e.series.map((x) => x.peso ?? 0));
      const hayDatos = e.series.some((x) => x.reps || x.peso);
      if (!hayDatos) continue;
      const r = m.get(e.ejercicioId) ?? { ejercicioId: e.ejercicioId, nombre: e.nombre, grupo: e.grupo, pesoMax: 0, fechaMax: s.fecha, ultimaVez: s.fecha, evolucion: [] };
      r.nombre = e.nombre;
      r.ultimaVez = s.fecha;
      if (max > r.pesoMax) {
        r.pesoMax = max;
        r.fechaMax = s.fecha;
      }
      if (max > 0) r.evolucion.push({ fecha: s.fecha, peso: max });
      m.set(e.ejercicioId, r);
    }
  }
  return [...m.values()].sort((a, b) => b.ultimaVez.localeCompare(a.ultimaVez));
}

/** Volumen total por grupo muscular de las sesiones desde una fecha (incluida). */
export function volumenPorGrupo(sesiones: Sesion[], desde: string) {
  const m = new Map<string, number>();
  for (const s of sesiones) {
    if (s.fecha < desde) continue;
    for (const e of s.ejercicios) m.set(e.grupo, (m.get(e.grupo) ?? 0) + volumenEjercicio(e));
  }
  return [...m.entries()].filter(([, v]) => v > 0).map(([grupo, volumen]) => ({ grupo, volumen })).sort((a, b) => b.volumen - a.volumen);
}

export const formatoVolumen = (kg: number) => (kg >= 10000 ? `${(kg / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} t` : `${Math.round(kg).toLocaleString('es')} kg`);
