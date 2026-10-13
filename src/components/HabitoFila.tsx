import { useState } from 'react';
import type { Habito } from '../lib/db';
import { toggleHabito } from '../lib/db';
import { Icon } from './Icon';

export function HabitoFila({ habito, hecho, fecha, racha }: { habito: Habito; hecho: boolean; fecha: string; racha?: number }) {
  const [anim, setAnim] = useState(0);

  const alternar = async () => {
    const ahora = await toggleHabito(habito.id!, fecha);
    if (ahora) {
      setAnim((n) => n + 1);
      navigator.vibrate?.(12);
    }
  };

  return (
    <button
      onClick={alternar}
      aria-pressed={hecho}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-300 active:scale-[0.985] ${
        hecho ? 'border-dorado/30 bg-dorado/[0.07]' : 'bg-campo/60 hover:bg-campo border-transparent'
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/25 text-xl">{habito.emoji || '•'}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] leading-snug font-medium transition-colors ${hecho ? 'text-champagne' : 'text-texto'}`}>
          {habito.nombre}
        </span>
        {habito.origen === 'coach' && <span className="text-dorado/90 mt-0.5 block text-[10px] font-semibold tracking-wide uppercase">De tu coach</span>}
        {racha !== undefined && racha > 0 && (
          <span className="text-dorado mt-0.5 inline-flex items-center gap-1 text-xs font-medium">
            <Icon name="fuego" size={12} /> {racha} {racha === 1 ? 'día' : 'días'} seguidos
          </span>
        )}
      </span>
      <span
        key={anim}
        className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ${
          hecho ? 'bg-dorado border-dorado text-fondo' : 'group-hover:border-dorado/50 border-[#444] text-transparent'
        }`}
        style={hecho && anim ? { animation: 'pop 0.38s cubic-bezier(0.34,1.56,0.64,1), brillo 0.7s ease-out' } : undefined}
      >
        <Icon name="check" size={18} strokeWidth={3} />
      </span>
    </button>
  );
}
