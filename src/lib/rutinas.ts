import { db, type EjercicioRutina, type Nutricion, type Rutina, type Sesion } from './db';
import { diasEntre, fechaCorta, hoyISO, sumarDias } from './fechas';
import { num } from './format';
import { supabase } from './nube';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const diaDeHoy = () => DIAS_SEMANA[(new Date().getDay() + 6) % 7];

/** 90 → "1 min 30 s", 120 → "2 min", 45 → "45 s". */
export function textoDescanso(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  if (!m) return `${s} s`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** Texto corto del objetivo de un ejercicio: "4 × 8–10 · 50 kg · RIR 2 · Descanso 1 min 30 s". */
export function textoObjetivo(e: EjercicioRutina): string {
  const partes: string[] = [];
  if (e.series || e.reps) partes.push(`${e.series ?? '?'} × ${e.reps || '?'}`);
  if (e.peso) partes.push(`${num(e.peso)} kg`);
  if (e.rir !== undefined) partes.push(`RIR ${e.rir}`);
  if (e.descanso) partes.push(`Descanso ${textoDescanso(e.descanso)}`);
  return partes.join(' · ');
}

/** Sesión nueva a partir de una rutina, con las series ya llenas con el objetivo. */
export function sesionDesdeRutina(r: Rutina): Sesion {
  return {
    fecha: hoyISO(),
    nombre: r.nombre,
    rutinaUid: r.uid,
    ejercicios: r.ejercicios.map((e) => {
      const reps = Number.parseInt(e.reps ?? '', 10);
      return {
        ejercicioId: e.ejercicioId,
        nombre: e.nombre,
        grupo: e.grupo,
        objetivo: [textoObjetivo(e), e.nota].filter(Boolean).join(' · ') || undefined,
        series: Array.from({ length: Math.max(1, e.series ?? 1) }, () => ({
          reps: Number.isFinite(reps) ? reps : undefined,
          peso: e.peso,
          rir: e.rir,
        })),
      };
    }),
  };
}

/** Abre la guía de alimentación (PDF): con internet usa el enlace de la nube; sin internet, la copia guardada. */
export async function abrirPdf(n: Nutricion) {
  // Se abre la ventana antes de esperar (si no, Safari la bloquea).
  const ventana = window.open('', '_blank');
  let url: string | undefined;
  if (navigator.onLine && supabase) {
    const { data } = await supabase.storage.from('nutricion').createSignedUrl(n.path, 3600);
    url = data?.signedUrl;
  }
  if (!url && n.archivo) url = URL.createObjectURL(n.archivo);
  if (!url) {
    ventana?.close();
    alert('No se pudo abrir la guía. Conéctate a internet e inténtalo de nuevo.');
    return;
  }
  if (ventana) ventana.location.href = url;
  else window.location.href = url;
}

export const rutinasOrdenadas = () => db.rutinas.orderBy('orden').toArray();

/* ───────────── Bloques / semanas ───────────── */

export type EstadoBloque = 'vigente' | 'proximo' | 'terminado';

/** Una rutina sin fechas siempre está vigente. */
export function estadoRutina(r: Pick<Rutina, 'inicio' | 'fin'>, hoy = hoyISO()): EstadoBloque {
  if (r.inicio && r.inicio > hoy) return 'proximo';
  if (r.fin && r.fin < hoy) return 'terminado';
  return 'vigente';
}

export interface Bloque {
  clave: string; // nombre|inicio|fin
  nombre?: string;
  inicio?: string;
  fin?: string;
  rutinas: Rutina[];
  estado: EstadoBloque;
}

/** Agrupa las rutinas por bloque: primero las vigentes, luego las próximas (por fecha) y al final las terminadas. */
export function agruparBloques<T extends Rutina>(rutinas: T[], hoy = hoyISO()): (Bloque & { rutinas: T[] })[] {
  const mapa = new Map<string, Bloque & { rutinas: T[] }>();
  for (const r of rutinas) {
    const clave = `${r.bloque ?? ''}|${r.inicio ?? ''}|${r.fin ?? ''}`;
    let b = mapa.get(clave);
    if (!b) mapa.set(clave, (b = { clave, nombre: r.bloque, inicio: r.inicio, fin: r.fin, rutinas: [], estado: estadoRutina(r, hoy) }));
    b.rutinas.push(r);
  }
  const peso = { vigente: 0, proximo: 1, terminado: 2 };
  return [...mapa.values()].sort(
    (a, b) =>
      peso[a.estado] - peso[b.estado] ||
      (a.estado === 'terminado' ? (b.inicio ?? '').localeCompare(a.inicio ?? '') : (a.inicio ?? '').localeCompare(b.inicio ?? '')),
  );
}

/** "Del 6 oct al 19 oct", "Desde el 6 oct", "Hasta el 19 oct" o "" si no tiene fechas. */
export function textoFechas(b: { inicio?: string; fin?: string }): string {
  if (b.inicio && b.fin) return `Del ${fechaCorta(b.inicio)} al ${fechaCorta(b.fin)}`;
  if (b.inicio) return `Desde el ${fechaCorta(b.inicio)}`;
  if (b.fin) return `Hasta el ${fechaCorta(b.fin)}`;
  return '';
}

/** Semanas completas entre inicio y fin (0 si no hay fin). */
export const semanasDe = (inicio?: string, fin?: string) => (inicio && fin ? Math.max(1, Math.round((diasEntre(inicio, fin) + 1) / 7)) : 0);
/** Fin de un bloque que dura `semanas` semanas (undefined = sin fin). */
export const finDe = (inicio: string | undefined, semanas: number) => (inicio && semanas > 0 ? sumarDias(inicio, semanas * 7 - 1) : undefined);

/** Lo que ve el cliente: rutinas vigentes hoy y el próximo bloque que viene. */
export async function planVigente() {
  const hoy = hoyISO();
  const todas = await rutinasOrdenadas();
  const vigentes = todas.filter((r) => estadoRutina(r, hoy) === 'vigente');
  const proxima = todas.filter((r) => r.inicio && r.inicio > hoy).sort((a, b) => a.inicio!.localeCompare(b.inicio!))[0];
  return { vigentes, proximo: proxima ? { nombre: proxima.bloque, inicio: proxima.inicio! } : undefined };
}
