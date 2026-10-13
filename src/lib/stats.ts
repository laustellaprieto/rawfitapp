import type { Habito, RegistroHabito } from './db';
import { hoyISO, sumarDias } from './dates';

/** Mapa fecha → set de ids de hábitos cumplidos. */
export function indexarRegistros(registros: RegistroHabito[]): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const r of registros) {
    if (!m.has(r.fecha)) m.set(r.fecha, new Set());
    m.get(r.fecha)!.add(r.habitoId);
  }
  return m;
}

export function porcentajeDia(fecha: string, activos: Habito[], idx: Map<string, Set<number>>): number {
  if (!activos.length) return 0;
  const hechos = idx.get(fecha);
  if (!hechos) return 0;
  return activos.filter((h) => hechos.has(h.id!)).length / activos.length;
}

/**
 * Racha de "días completos" (todos los hábitos activos cumplidos).
 * Si hoy todavía no está completo, la racha cuenta hasta ayer.
 */
export function rachaDiasCompletos(activos: Habito[], idx: Map<string, Set<number>>): number {
  if (!activos.length) return 0;
  let dia = hoyISO();
  if (porcentajeDia(dia, activos, idx) < 1) dia = sumarDias(dia, -1);
  let racha = 0;
  while (porcentajeDia(dia, activos, idx) >= 1) {
    racha++;
    dia = sumarDias(dia, -1);
  }
  return racha;
}

/** Racha de un hábito concreto (si hoy no está marcado, cuenta hasta ayer). */
export function rachaHabito(habitoId: number, idx: Map<string, Set<number>>): number {
  let dia = hoyISO();
  if (!idx.get(dia)?.has(habitoId)) dia = sumarDias(dia, -1);
  let racha = 0;
  while (idx.get(dia)?.has(habitoId)) {
    racha++;
    dia = sumarDias(dia, -1);
  }
  return racha;
}

/** % de cumplimiento de un hábito en los últimos `dias` días (incluye hoy). */
export function cumplimientoHabito(habitoId: number, idx: Map<string, Set<number>>, dias = 30): number {
  let hechos = 0;
  for (let i = 0; i < dias; i++) if (idx.get(sumarDias(hoyISO(), -i))?.has(habitoId)) hechos++;
  return hechos / dias;
}
