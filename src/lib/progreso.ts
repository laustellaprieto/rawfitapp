import type { Medicion } from './db';
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


export type CampoMedicion = 'peso' | 'cintura' | 'abdomen';

export const CAMPOS_MEDICION: { campo: CampoMedicion; nombre: string; unidad: string }[] = [
  { campo: 'peso', nombre: 'Peso', unidad: 'kg' },
  { campo: 'cintura', nombre: 'Cintura', unidad: 'cm' },
  { campo: 'abdomen', nombre: 'Abdomen', unidad: 'cm' },
];

/** Resumen de un campo: inicial, actual, cambio total y cambio vs la medición anterior. */
export function resumenCampo(lista: Medicion[], campo: CampoMedicion) {
  const con = lista.filter((m) => m[campo] !== undefined);
  if (!con.length) return undefined;
  const inicial = con[0][campo]!;
  const actual = con[con.length - 1][campo]!;
  const anterior = con.length > 1 ? con[con.length - 2][campo]! : undefined;
  return {
    inicial,
    actual,
    n: con.length,
    total: con.length > 1 ? actual - inicial : undefined,
    vsAnterior: anterior !== undefined ? actual - anterior : undefined,
  };
}

export interface Analisis {
  tipo: 'grasa' | 'recomposicion' | 'prioriza' | 'revisa' | 'faltan';
  titulo: string;
  texto: string;
}

/** Análisis automático según el cambio total de peso y cintura. */
export function analizar(lista: Medicion[]): Analisis {
  const peso = resumenCampo(lista, 'peso');
  const cintura = resumenCampo(lista, 'cintura');
  if (!peso || !cintura || peso.n < 2 || cintura.n < 2 || peso.total === undefined || cintura.total === undefined) {
    return { tipo: 'faltan', titulo: 'Registra al menos 2 mediciones', texto: 'Con dos mediciones de peso y cintura te diremos cómo vas.' };
  }
  const bajaPeso = peso.total < 0;
  const bajaCintura = cintura.total < 0;
  if (bajaPeso && bajaCintura) return { tipo: 'grasa', titulo: 'Estás perdiendo grasa. ¡Sigue así!', texto: 'Bajan tu peso y tu cintura: vas en la dirección correcta.' };
  if (bajaCintura) return { tipo: 'recomposicion', titulo: 'Probablemente ganas músculo y pierdes grasa (recomposición).', texto: 'Tu cintura baja aunque el peso no: tu cuerpo está cambiando.' };
  if (bajaPeso) return { tipo: 'prioriza', titulo: 'Prioriza proteína, fuerza y descanso.', texto: 'Bajas de peso pero no de cintura: cuida no perder músculo.' };
  return { tipo: 'revisa', titulo: 'Revisa constancia, calorías y sueño.', texto: 'Ni el peso ni la cintura bajan todavía. Ajusta lo básico y sigue registrando.' };
}

/** Relación cintura/estatura (Ashwell et al. 2012, Obesity Reviews). */
export function cinturaEstatura(cintura: number, estatura: number) {
  const valor = cintura / estatura;
  if (valor < 0.5) return { valor, nivel: 'bajo' as const, texto: 'Rango asociado a menor riesgo.' };
  if (valor < 0.6) return { valor, nivel: 'medio' as const, texto: 'Riesgo aumentado.' };
  return { valor, nivel: 'alto' as const, texto: 'Riesgo alto. Te sugerimos una valoración con un profesional de la salud.' };
}
