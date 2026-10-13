import type { Ajustes, Medida } from './db';

export type CampoMedida = 'peso' | 'grasa' | 'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo';

export const CAMPOS: { campo: CampoMedida; nombre: string; tipo: 'peso' | 'pct' | 'long' }[] = [
  { campo: 'peso', nombre: 'Peso', tipo: 'peso' },
  { campo: 'grasa', nombre: '% Grasa', tipo: 'pct' },
  { campo: 'cintura', nombre: 'Cintura', tipo: 'long' },
  { campo: 'cadera', nombre: 'Cadera', tipo: 'long' },
  { campo: 'pecho', nombre: 'Pecho', tipo: 'long' },
  { campo: 'brazo', nombre: 'Brazo', tipo: 'long' },
  { campo: 'muslo', nombre: 'Muslo', tipo: 'long' },
];

export function unidadDe(campo: CampoMedida, a: Pick<Ajustes, 'unidadPeso' | 'unidadMedida'>): string {
  const t = CAMPOS.find((c) => c.campo === campo)!.tipo;
  return t === 'peso' ? a.unidadPeso : t === 'pct' ? '%' : a.unidadMedida;
}

/** Valor anterior registrado de un campo antes del índice dado (lista ordenada por fecha asc). */
export function anterior(lista: Medida[], i: number, campo: CampoMedida): number | undefined {
  for (let j = i - 1; j >= 0; j--) if (lista[j][campo] !== undefined) return lista[j][campo];
  return undefined;
}

export function primeroYUltimo(lista: Medida[], campo: CampoMedida) {
  const con = lista.filter((m) => m[campo] !== undefined);
  if (!con.length) return undefined;
  return { primero: con[0], ultimo: con[con.length - 1], n: con.length };
}
