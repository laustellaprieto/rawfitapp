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

/* ───────────── Macros ───────────── */

export interface RangoMacros {
  proteina: { min: number; max: number; porDefecto: number; paso: number }; // g por kg de peso
  grasa: { min: number; max: number; porDefecto: number; paso: number }; // % de las calorías
  carbos: { min: number; max: number }; // g por kg de peso (referencia)
}

/**
 * Rangos recomendados por meta.
 * Proteína: ISSN (Jäger et al., 2017) — 1,4–2,0 g/kg para personas activas y más alto en déficit.
 * Grasa: 20–35 % de las calorías (rango aceptable, Institute of Medicine).
 * Carbohidratos: lo que queda; referencia según Thomas et al. (2016, ACSM).
 */
export const RANGOS_MACROS: Record<MetaCalorias, RangoMacros> = {
  definicion: {
    proteina: { min: 1.8, max: 2.4, porDefecto: 2.2, paso: 0.2 },
    grasa: { min: 20, max: 30, porDefecto: 25, paso: 5 },
    carbos: { min: 2, max: 4 },
  },
  mantenimiento: {
    proteina: { min: 1.6, max: 2.0, porDefecto: 1.8, paso: 0.2 },
    grasa: { min: 25, max: 35, porDefecto: 30, paso: 5 },
    carbos: { min: 3, max: 5 },
  },
  volumen: {
    proteina: { min: 1.6, max: 2.2, porDefecto: 2.0, paso: 0.2 },
    grasa: { min: 20, max: 30, porDefecto: 25, paso: 5 },
    carbos: { min: 4, max: 7 },
  },
};

/** Valores entre min y max con el paso indicado (para los botones). */
export function opcionesRango(r: { min: number; max: number; paso: number }): number[] {
  const out: number[] = [];
  for (let v = r.min; v <= r.max + 1e-9; v += r.paso) out.push(Math.round(v * 10) / 10);
  return out;
}

const ajustar = (v: number | undefined, r: { min: number; max: number; porDefecto: number }) =>
  v === undefined || v < r.min - 1e-9 || v > r.max + 1e-9 ? r.porDefecto : v;

export interface Macro {
  gramos: number;
  kcal: number;
  pct: number; // % de las calorías del día
  gPorKg: number;
}

export interface ResultadoMacros {
  proteina: Macro;
  grasa: Macro;
  carbos: Macro;
  proteinaGkg: number; // valor elegido (ya ajustado al rango)
  grasaPct: number;
  rango: RangoMacros;
  estadoCarbos: 'bajo' | 'ok' | 'alto';
}

/** Proteína y grasa según lo elegido; los carbohidratos completan las calorías del día. */
export function calcularMacros(kcalDia: number, peso: number, meta: MetaCalorias, proteinaGkg?: number, grasaPct?: number): ResultadoMacros {
  const rango = RANGOS_MACROS[meta];
  const pGkg = ajustar(proteinaGkg, rango.proteina);
  const gPct = ajustar(grasaPct, rango.grasa);
  const pG = Math.round(pGkg * peso);
  const gG = Math.round((kcalDia * gPct) / 100 / 9);
  const cG = Math.max(0, Math.round((kcalDia - pG * 4 - gG * 9) / 4));
  const macro = (gramos: number, porGramo: number): Macro => ({
    gramos,
    kcal: gramos * porGramo,
    pct: Math.round(((gramos * porGramo) / kcalDia) * 100),
    gPorKg: Math.round((gramos / peso) * 10) / 10,
  });
  const carbos = macro(cG, 4);
  return {
    proteina: macro(pG, 4),
    grasa: macro(gG, 9),
    carbos,
    proteinaGkg: pGkg,
    grasaPct: gPct,
    rango,
    estadoCarbos: carbos.gPorKg < rango.carbos.min ? 'bajo' : carbos.gPorKg > rango.carbos.max ? 'alto' : 'ok',
  };
}

/** Macros del perfil guardado (si se pueden calcular). */
export function macrosDelPerfil(p: Pick<Perfil, 'sexo' | 'peso' | 'estatura' | 'edad' | 'actividad' | 'meta' | 'porcentaje' | 'proteinaGkg' | 'grasaPct'>) {
  const r = calcularCalorias(p);
  if (!r || !p.peso) return undefined;
  return calcularMacros(r.objetivo, p.peso, r.meta, p.proteinaGkg, p.grasaPct);
}
