const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const hoyISO = () => toISO(new Date());

export function sumarDias(iso: string, dias: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

/** Lunes de la semana que contiene la fecha. */
export function inicioSemana(iso: string): string {
  const d = fromISO(iso);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia);
  return toISO(d);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const diaCorto = (iso: string) => DIAS_CORTOS[fromISO(iso).getDay()];

export function fechaCorta(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function fechaLarga(iso: string): string {
  return fromISO(iso).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function fechaRelativa(iso: string): string {
  const d = diasEntre(iso, hoyISO());
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d > 1 && d < 7) return `Hace ${d} días`;
  return fechaCorta(iso) + (fromISO(iso).getFullYear() !== new Date().getFullYear() ? ` ${fromISO(iso).getFullYear()}` : '');
}

/** Día del reto: el día de inicio es el "Día 1". */
export const diaDelReto = (fechaInicio: string) => diasEntre(fechaInicio, hoyISO()) + 1;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number);
  return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} ${y}`;
};
