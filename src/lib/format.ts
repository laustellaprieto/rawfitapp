export function num(n: number | undefined, dec = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('es', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

export function signo(n: number, dec = 1): string {
  const s = num(Math.abs(n), dec);
  if (Math.abs(n) < 10 ** -dec / 2) return '0';
  return (n > 0 ? '+' : '−') + s;
}

/** Convierte el texto de un input numérico (acepta coma decimal) a número. */
export function parseNum(v: string): number | undefined {
  const t = v.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Número → texto para un campo editable, con coma decimal (62,5). */
export const numTxt = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));
