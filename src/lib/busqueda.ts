/**
 * Búsqueda de ejercicios tolerante: sin acentos, sin importar el orden de las palabras,
 * con plurales y sinónimos (ej. "acostado" encuentra "tumbado", "mancuerna" encuentra "mancuernas").
 */
import type { EjercicioBanco } from '../data/ejercicios';

export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Grupos de palabras que significan lo mismo para buscar. */
const SINONIMOS: string[][] = [
  ['acostado', 'tumbado', 'tendido', 'echado'],
  ['mancuerna', 'dumbbell', 'pesa'],
  ['barra', 'barbell'],
  ['banda', 'liga', 'elastica', 'elastico'],
  ['sentadilla', 'squat'],
  ['zancada', 'estocada', 'lunge', 'desplante'],
  ['atras', 'inversa', 'reversa'],
  ['peso muerto', 'deadlift'],
  ['gluteo', 'glute'],
  ['femoral', 'isquio', 'isquiotibial', 'isquiotibiales', 'hamstring'],
  ['cuadriceps', 'cuadricep', 'pierna'],
  ['pantorrilla', 'gemelo', 'chamorro', 'soleo'],
  ['pecho', 'pectoral'],
  ['espalda', 'dorsal'],
  ['hombro', 'deltoide'],
  ['militar', 'overhead'],
  ['abdomen', 'abdominal', 'core', 'abs'],
  ['flexion', 'lagartija', 'push up', 'pushup'],
  ['dominada', 'pull up', 'pullup'],
  ['jalon', 'polea'],
  ['remo', 'row'],
  ['sentado', 'sentada'],
  ['de pie', 'parado', 'parada'],
  ['cardio', 'hiit'],
  ['movilidad', 'estiramiento', 'stretch'],
];

/** Quita plurales simples: "mancuernas" → "mancuerna", "flexiones" → "flexion". */
function raiz(p: string): string {
  if (p.length > 4 && p.endsWith('es') && !p.endsWith('ces')) return p.slice(0, -2);
  if (p.length > 3 && p.endsWith('s')) return p.slice(0, -1);
  return p;
}

const palabras = (t: string) =>
  normalizar(t)
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean)
    .map(raiz);

const MAPA = new Map<string, string[]>();
for (const grupo of SINONIMOS) {
  const raices = grupo.map((g) => palabras(g).join(' '));
  for (const r of raices) MAPA.set(r, raices);
}

/** Variantes de una palabra de búsqueda (ella misma y sus sinónimos). */
function variantes(p: string): string[] {
  return MAPA.get(p) ?? [p];
}

/** Texto donde se busca: nombre, sinónimos, grupo y equipo. */
function textoDe(e: EjercicioBanco): string {
  return ' ' + palabras([e.nombre, ...(e.alias ?? []), e.grupo, e.equipo].join(' ')).join(' ') + ' ';
}

/** ¿Coincide el ejercicio con todas las palabras buscadas (en cualquier orden)? */
export function coincide(e: EjercicioBanco, consulta: string): boolean {
  const qs = palabras(consulta);
  if (!qs.length) return true;
  const texto = textoDe(e);
  // Cada palabra buscada debe aparecer como inicio de alguna palabra del ejercicio (o un sinónimo suyo).
  return qs.every((q) => variantes(q).some((v) => texto.includes(' ' + v)));
}

export function buscarEjercicios<T extends EjercicioBanco>(lista: T[], consulta: string): T[] {
  return lista.filter((e) => coincide(e, consulta));
}
