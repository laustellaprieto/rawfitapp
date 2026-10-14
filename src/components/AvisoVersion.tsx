import { actualizarAhora, useVersionNueva } from '../lib/version';

/** Aviso flotante cuando hay una versión nueva de la app (en vez de recargarla sola). */
export function AvisoVersion() {
  const hay = useVersionNueva();
  if (!hay) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="animate-entrada bg-tarjeta border-dorado/40 pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-2xl shadow-black/60">
        <p className="flex-1 text-sm">
          <b className="text-champagne">Hay una versión nueva</b> <span className="text-suave">de la app.</span>
        </p>
        <button className="btn-oro !px-3 !py-1.5 text-xs" onClick={actualizarAhora}>
          Actualizar
        </button>
      </div>
    </div>
  );
}
