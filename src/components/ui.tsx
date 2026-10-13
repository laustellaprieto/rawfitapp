import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { signo } from '../lib/format';

export function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string; accion?: ReactNode }) {
  return (
    <header className="animate-entrada mb-5 flex items-end justify-between gap-3">
      <div>
        {subtitulo && <p className="text-suave text-xs font-medium tracking-[0.2em] uppercase">{subtitulo}</p>}
        <h1 className="titulo text-4xl leading-none">{titulo}</h1>
      </div>
      {accion}
    </header>
  );
}

export function BotonAgregar({ onClick, children = 'Agregar' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} className="btn-oro !py-2.5 shrink-0">
      <Icon name="mas" size={18} strokeWidth={2.4} />
      {children}
    </button>
  );
}

export function Vacio({ icono, titulo, texto, accion }: { icono: Parameters<typeof Icon>[0]['name']; titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="tarjeta animate-entrada flex flex-col items-center px-6 py-10 text-center">
      <div className="bg-dorado/10 text-dorado mb-4 grid size-14 place-items-center rounded-2xl">
        <Icon name={icono} size={28} />
      </div>
      <h3 className="titulo text-2xl">{titulo}</h3>
      <p className="text-suave mt-1 mb-5 max-w-xs text-sm">{texto}</p>
      {accion}
    </div>
  );
}

/** Indicador de cambio: verde si baja, rojo si sube. */
export function Delta({ valor, unidad = '', dec = 1, className = '' }: { valor: number | undefined; unidad?: string; dec?: number; className?: string }) {
  if (valor === undefined || Number.isNaN(valor)) return null;
  const neutro = Math.abs(valor) < 10 ** -dec / 2;
  const color = neutro ? 'text-suave bg-white/5' : valor < 0 ? 'text-baja bg-baja/10' : 'text-sube bg-sube/10';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color} ${className}`}>
      {!neutro && <span aria-hidden>{valor < 0 ? '↓' : '↑'}</span>}
      {signo(valor, dec)}
      {unidad && <span className="opacity-80"> {unidad}</span>}
    </span>
  );
}

export function Anillo({ progreso, tam = 88, grosor = 8, children }: { progreso: number; tam?: number; grosor?: number; children?: ReactNode }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progreso));
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} stroke="#2B2B2B" strokeWidth={grosor} fill="none" />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          stroke="url(#oro)"
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <defs>
          <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8D9B5" />
            <stop offset="100%" stopColor="#C9A96E" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Stat({ etiqueta, valor, extra, icono }: { etiqueta: string; valor: ReactNode; extra?: ReactNode; icono?: Parameters<typeof Icon>[0]['name'] }) {
  return (
    <div className="tarjeta flex flex-col gap-1">
      <div className="text-suave flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
        {icono && <Icon name={icono} size={14} className="text-dorado" />}
        {etiqueta}
      </div>
      <div className="titulo text-3xl leading-none">{valor}</div>
      {extra && <div className="text-xs">{extra}</div>}
    </div>
  );
}

export function Segmentos<T extends string>({ opciones, valor, onChange }: { opciones: { valor: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={() => onChange(o.valor)}
          className={`chip shrink-0 ${o.valor === valor ? 'bg-dorado text-fondo' : 'bg-campo text-suave hover:text-texto'}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function PiePagina() {
  return (
    <footer className="text-suave mt-10 flex flex-col items-center gap-1.5 pb-2 text-center text-xs">
      <div className="bg-dorado/40 mb-2 h-px w-10" />
      <a
        href="https://instagram.com/rawfit.stella"
        target="_blank"
        rel="noopener noreferrer"
        className="text-champagne hover:text-dorado inline-flex items-center gap-1.5 font-semibold"
      >
        <Icon name="instagram" size={14} />
        @rawfit.stella
      </a>
      <p>RawFit · Kit de Seguimiento</p>
      <p className="opacity-70">Tus datos se guardan solo en este dispositivo.</p>
    </footer>
  );
}
