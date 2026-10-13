import { diasEntre, hoyISO, sumarDias } from './fechas';

export const CADA_DIAS_FOTOS = 15;

/**
 * Check-ins de fotos: el día de inicio y luego cada 15 días.
 * Devuelve la fecha del último check-in que ya tocaba, si está pendiente, y cuántos días faltan para el siguiente.
 */
export function estadoCheckinFotos(fechaInicio: string, fechasCheckins: string[]) {
  const hoy = hoyISO();
  const transcurridos = Math.max(0, diasEntre(fechaInicio, hoy));
  const n = Math.floor(transcurridos / CADA_DIAS_FOTOS);
  const tocaba = sumarDias(fechaInicio, n * CADA_DIAS_FOTOS);
  const siguiente = sumarDias(fechaInicio, (n + 1) * CADA_DIAS_FOTOS);
  const pendiente = !fechasCheckins.some((f) => f >= tocaba);
  return { pendiente, tocaba, numero: n, siguiente, faltan: diasEntre(hoy, siguiente) };
}
