import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Pila de hojas abiertas: Escape solo cierra la de más arriba. */
const pila: symbol[] = [];

/**
 * Hoja inferior (en escritorio, ventana centrada).
 * Con `formulario`, NO se cierra al tocar el fondo ni con Escape (para no perder lo escrito):
 * solo con la X o con el botón Cancelar del propio formulario.
 */
export function Sheet({
  abierto,
  onCerrar,
  titulo,
  children,
  formulario = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  formulario?: boolean;
}) {
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;
    const yo = Symbol();
    pila.push(yo);
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => !formulario && e.key === 'Escape' && pila[pila.length - 1] === yo && cerrar.current();
    window.addEventListener('keydown', onKey);
    return () => {
      const i = pila.indexOf(yo);
      if (i >= 0) pila.splice(i, 1);
      if (!pila.length) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto, formulario]);

  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="animate-entrada absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={formulario ? undefined : onCerrar} />
      <div className="animate-hoja bg-tarjeta relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/5 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="titulo text-champagne text-2xl">{titulo}</h2>
          <button onClick={onCerrar} className="bg-campo text-texto hover:bg-[#363636] -mr-1 grid size-10 shrink-0 place-items-center rounded-full" aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
