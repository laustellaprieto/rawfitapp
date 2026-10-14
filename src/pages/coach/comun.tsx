import type { PerfilNube } from '../../lib/nube';

export const nombreDe = (p: PerfilNube) => p.nombre || p.email.split('@')[0];

export function Avatar({ p, tam = 'size-10' }: { p: PerfilNube; tam?: string }) {
  return <span className={`bg-dorado/15 text-dorado titulo grid ${tam} shrink-0 place-items-center rounded-full text-lg`}>{nombreDe(p).slice(0, 1).toUpperCase()}</span>;
}
