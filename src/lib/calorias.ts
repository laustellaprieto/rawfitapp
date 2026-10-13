import type { MetaCalorias, NivelActividad, Perfil, Sexo } from './db';

export const ACTIVIDADES: { valor: NivelActividad; nombre: string; detalle: string; factor: number }[] = [
  { valor: 'sedentaria', nombre: 'Sedentaria', detalle: 'Trabajo sentado, casi sin ejercicio', factor: 1.2 },
  { valor: 'ligera', nombre: 'Ligera', detalle: 'Ejercicio 1–3 días por semana', factor: 1.375 },
  { valor: 'moderada', nombre: 'Moderada', detalle: 'Ejercicio 3–5 días por semana', factor: 1.55 },
  { valor: 'alta', nombre: 'Alta', detalle: 'Ejercicio intenso 6–7 días por semana', factor: 1.725 },
  { valor: 'muy-alta', nombre: 'Muy alta', detalle: 'Trabajo físico + entreno diario', factor: 1.9 },
];

export const METAS: { valor: MetaCalorias; nombre: string; detalle: string; porcentajes: number[]; porDefecto: number }[] = [
  { valor: 'definicion', nombre: 'Definición', detalle: 'Perder grasa (déficit)', porcentajes: [10, 15, 20, 25], porDefecto: 15 },
  { valor: 'mantenimiento', nombre: 'Mantenimiento', detalle: 'Mantener tu peso', porcentajes: [], porDefecto: 0 },
  { valor: 'volumen', nombre: 'Volumen', detalle: 'Ganar músculo (superávit)', porcentajes: [5, 10, 15, 20], porDefecto: 10 },
];

/** Tasa metabólica basal (Mifflin-St Jeor, 1990). */
export function caloriasBasales(sexo: Sexo, peso: number, estatura: number, edad: number): number {
  return 10 * peso + 6.25 * estatura - 5 * edad + (sexo === 'hombre' ? 5 : -161);
}

export interface ResultadoCalorias {
  basales: number;
  mantenimiento: number;
  objetivo: number;
  meta: MetaCalorias;
  porcentaje: number;
}

type DatosCalculo = Pick<Perfil, 'sexo' | 'peso' | 'estatura' | 'edad' | 'actividad' | 'meta' | 'porcentaje'>;

/** Calcula las calorías si están todos los datos necesarios. */
export function calcularCalorias(d: DatosCalculo): ResultadoCalorias | undefined {
  if (!d.sexo || !d.peso || !d.estatura || !d.edad) return undefined;
  const basales = caloriasBasales(d.sexo, d.peso, d.estatura, d.edad);
  const factor = ACTIVIDADES.find((a) => a.valor === (d.actividad ?? 'ligera'))!.factor;
  const mantenimiento = basales * factor;
  const meta = d.meta ?? 'mantenimiento';
  const porcentaje = meta === 'mantenimiento' ? 0 : (d.porcentaje ?? METAS.find((m) => m.valor === meta)!.porDefecto);
  const objetivo = mantenimiento * (1 + (meta === 'definicion' ? -porcentaje : porcentaje) / 100);
  return { basales: redondear(basales), mantenimiento: redondear(mantenimiento), objetivo: redondear(objetivo), meta, porcentaje };
}

/** Redondea a múltiplos de 10 kcal. */
const redondear = (n: number) => Math.round(n / 10) * 10;

export const kcal = (n: number) => `${n.toLocaleString('es')} kcal`;

export function textoMeta(r: Pick<ResultadoCalorias, 'meta' | 'porcentaje'>): string {
  if (r.meta === 'mantenimiento') return 'Mantenimiento';
  return `${r.meta === 'definicion' ? 'Definición' : 'Volumen'} ${r.meta === 'definicion' ? '−' : '+'}${r.porcentaje} %`;
}

/** Rangos válidos de los datos. */
export const valido = {
  peso: (n?: number) => n !== undefined && n >= 30 && n <= 300,
  estatura: (n?: number) => n !== undefined && n >= 100 && n <= 250,
  edad: (n?: number) => n !== undefined && n >= 14 && n <= 100,
};
