import type { Habito, RegistroHabito } from './db';
import { hoyISO, sumarDias } from './fechas';

export type IndiceRegistros = Map<string, Set<number>>;

/** Umbral para que un día cuente en la racha. */
export const UMBRAL_RACHA = 0.8;

export function indexarRegistros(registros: RegistroHabito[]): IndiceRegistros {
  const m: IndiceRegistros = new Map();
  for (const r of registros) {
    if (!m.has(r.fecha)) m.set(r.fecha, new Set());
    m.get(r.fecha)!.add(r.habitoId);
  }
  return m;
}

export function hechosDia(fecha: string, activos: Habito[], idx: IndiceRegistros): number {
  const set = idx.get(fecha);
  return set ? activos.filter((h) => set.has(h.id!)).length : 0;
}

export function porcentajeDia(fecha: string, activos: Habito[], idx: IndiceRegistros): number {
  return activos.length ? hechosDia(fecha, activos, idx) / activos.length : 0;
}

const cuenta = (fecha: string, activos: Habito[], idx: IndiceRegistros) => activos.length > 0 && porcentajeDia(fecha, activos, idx) >= UMBRAL_RACHA - 1e-9;

export interface Racha {
  dias: number;
  inicio?: string; // primer día de la racha
  hoyCuenta: boolean;
}

/** Racha actual de días con ≥ 80 %. Si hoy aún no llega, cuenta hasta ayer. */
export function rachaActual(activos: Habito[], idx: IndiceRegistros): Racha {
  const hoy = hoyISO();
  const hoyCuenta = cuenta(hoy, activos, idx);
  let dia = hoyCuenta ? hoy : sumarDias(hoy, -1);
  let dias = 0;
  let inicio: string | undefined;
  while (cuenta(dia, activos, idx)) {
    dias++;
    inicio = dia;
    dia = sumarDias(dia, -1);
  }
  return { dias, inicio, hoyCuenta };
}

/** Mejor racha histórica (días con ≥ 80 %). */
export function mejorRacha(activos: Habito[], idx: IndiceRegistros): number {
  const fechas = [...idx.keys()].sort();
  if (!fechas.length) return 0;
  let mejor = 0;
  let actual = 0;
  let prev: string | undefined;
  for (const f of fechas) {
    if (!cuenta(f, activos, idx)) {
      actual = 0;
      prev = undefined;
      continue;
    }
    actual = prev && sumarDias(prev, 1) === f ? actual + 1 : 1;
    prev = f;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

/** Hitos que se celebran: 1, 7, 15, 30 y luego cada mes (60, 90, 120…). */
export function esHito(n: number): boolean {
  return n === 1 || n === 7 || n === 15 || n === 30 || (n > 30 && n % 30 === 0);
}

export function siguienteHito(n: number): number {
  for (const h of [1, 7, 15, 30]) if (n < h) return h;
  return (Math.floor(n / 30) + 1) * 30;
}

export function hitoAnterior(n: number): number {
  if (n >= 30) return Math.floor(n / 30) * 30;
  for (const h of [15, 7, 1]) if (n >= h) return h;
  return 0;
}

export function nombreHito(n: number): string {
  if (n === 1) return 'Primer día';
  if (n === 7) return '1 semana';
  if (n === 15) return '15 días';
  if (n === 30) return '1 mes';
  if (n % 30 === 0) return `${n / 30} meses`;
  return `${n} días`;
}

export function mensajeHito(n: number): { titulo: string; texto: string } {
  if (n === 1) return { titulo: '¡Primer día de racha!', texto: 'Lo más difícil es empezar y ya lo hiciste. Mañana, a repetirlo.' };
  if (n === 7) return { titulo: '¡Una semana de racha!', texto: '7 días seguidos cumpliendo tus hábitos. Esto ya no es suerte, es decisión.' };
  if (n === 15) return { titulo: '¡15 días de racha!', texto: 'Medio mes de constancia. Tu cuerpo y tu mente ya lo están notando.' };
  if (n === 30) return { titulo: '¡Un mes de racha!', texto: '30 días seguidos. Lo que empezó como esfuerzo ya es parte de ti.' };
  const meses = n / 30;
  return { titulo: `¡${meses} meses de racha!`, texto: `${n} días seguidos. Eres el ejemplo de que la constancia transforma.` };
}
