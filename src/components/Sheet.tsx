import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Pila de hojas abiertas: Escape solo cierra la de más arriba. */
const pila: symbol[] = [];

/** Hoja inferior (en escritorio, ventana centrada). */
export function Sheet({ abierto, onCerrar, titulo, children }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode }) {
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;
    const yo = Symbol();
    pila.push(yo);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && pila[pila.length - 1] === yo && cerrar.current();
    window.addEventListener('keydown', onKey);
    return () => {
      pila.splice(pila.indexOf(yo), 1);
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="animate-entrada absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCerrar} />
      <div className="animate-hoja bg-tarjeta relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/5 sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="titulo text-champagne text-2xl">{titulo}</h2>
          <button onClick={onCerrar} className="text-suave hover:text-texto -mr-2 rounded-full p-2" aria-label="Cerrar">
            <Icon name="cerrar" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
