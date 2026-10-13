import { db, type EjercicioRutina, type Nutricion, type Rutina, type Sesion } from './db';
import { hoyISO } from './fechas';
import { num } from './format';
import { supabase } from './nube';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const diaDeHoy = () => DIAS_SEMANA[(new Date().getDay() + 6) % 7];

/** Texto corto del objetivo de un ejercicio: "4 × 8–10 · 50 kg · RIR 2". */
export function textoObjetivo(e: EjercicioRutina): string {
  const partes: string[] = [];
  if (e.series || e.reps) partes.push(`${e.series ?? '?'} × ${e.reps || '?'}`);
  if (e.peso) partes.push(`${num(e.peso)} kg`);
  if (e.rir !== undefined) partes.push(`RIR ${e.rir}`);
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

/** Abre el PDF de nutrición: con internet usa el enlace de la nube; sin internet, la copia guardada. */
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
    alert('No se pudo abrir el PDF. Conéctate a internet e inténtalo de nuevo.');
    return;
  }
  if (ventana) ventana.location.href = url;
  else window.location.href = url;
}

export const rutinasOrdenadas = () => db.rutinas.orderBy('orden').toArray();
