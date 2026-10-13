import { useEffect, useMemo } from 'react';
import { mensajeHito } from '../lib/habitos';
import { Icon } from './Icon';

const COLORES = ['#C9A96E', '#E8D9B5', '#F2F2F2', '#7CC48A', '#b8925a'];

/** Ventana de felicitación con confeti al alcanzar un hito de racha. */
export function Celebracion({ hito, onCerrar }: { hito: number; onCerrar: () => void }) {
  const { titulo, texto } = mensajeHito(hito);
  const piezas = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.8,
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
        color: COLORES[i % COLORES.length],
        redondo: Math.random() < 0.3,
      })),
    [],
  );

  useEffect(() => {
    navigator.vibrate?.([30, 60, 30]);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="animate-entrada absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCerrar} />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {piezas.map((p, i) => (
          <span
            key={i}
            className="confeti absolute -top-4"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.redondo ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.redondo ? '50%' : 2,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}
      </div>
      <div className="animate-pop bg-tarjeta border-dorado/30 relative w-full max-w-sm rounded-3xl border p-7 text-center shadow-2xl">
        <div className="from-champagne to-dorado text-fondo mx-auto mb-4 grid size-20 place-items-center rounded-full bg-gradient-to-br shadow-[0_0_40px_rgba(201,169,110,0.45)]">
          <Icon name="fuego" size={40} strokeWidth={2} />
        </div>
        <p className="titulo text-dorado text-6xl leading-none">{hito}</p>
        <p className="text-suave mb-3 text-xs font-semibold tracking-[0.25em] uppercase">{hito === 1 ? 'día de racha' : 'días de racha'}</p>
        <h2 className="titulo text-champagne text-3xl">{titulo}</h2>
        <p className="text-texto/85 mt-2 mb-6 text-sm">{texto}</p>
        <button onClick={onCerrar} className="btn-oro w-full">
          ¡Vamos por más!
        </button>
      </div>
    </div>
  );
}
