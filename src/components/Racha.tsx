import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../lib/db';
import { fechaRelativa } from '../lib/fechas';
import { hitoAnterior, mejorRacha, nombreHito, rachaActual, siguienteHito, UMBRAL_RACHA, type IndiceRegistros } from '../lib/habitos';
import type { Habito } from '../lib/db';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

function hitosHasta(n: number): number[] {
  const base = [1, 7, 15, 30];
  for (let h = 60; h <= Math.max(n, 30) + 60; h += 30) base.push(h);
  return base;
}

function Medalla({ hito, ganada, tam = 'md' }: { hito: number; ganada: boolean; tam?: 'sm' | 'md' }) {
  const s = tam === 'sm' ? 'size-12 text-lg' : 'size-16 text-2xl';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`titulo grid ${s} place-items-center rounded-full border-2 leading-none transition ${
          ganada ? 'from-champagne to-dorado text-fondo border-champagne bg-gradient-to-br shadow-[0_0_18px_rgba(201,169,110,0.35)]' : 'border-[#333] bg-[#1f1f1f] text-[#555]'
        }`}
      >
        {hito}
      </div>
      <span className={`text-[10px] font-semibold ${ganada ? 'text-champagne' : 'text-suave/60'}`}>{nombreHito(hito)}</span>
    </div>
  );
}

/** Sección de racha: racha actual, mejor racha, próximo hito y medallas. */
export function SeccionRacha({ activos, idx }: { activos: Habito[]; idx: IndiceRegistros }) {
  const [abierta, setAbierta] = useState(false);
  const racha = rachaActual(activos, idx);
  const mejor = Math.max(mejorRacha(activos, idx), racha.dias);
  const sig = siguienteHito(racha.dias);
  const ant = hitoAnterior(racha.dias);
  const progreso = (racha.dias - ant) / (sig - ant);
  const visibles = [1, 7, 15, 30].concat(mejor >= 30 ? [hitoAnterior(mejor) + 30] : []).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <section className="tarjeta animate-entrada relative mb-4 overflow-hidden">
        <div className="bg-dorado/10 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="titulo text-2xl">Racha</h2>
          <button onClick={() => setAbierta(true)} className="text-dorado inline-flex items-center gap-1 text-sm font-semibold">
            Ver logros <Icon name="der" size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className={`grid size-20 shrink-0 place-items-center rounded-full ${racha.dias > 0 ? 'from-champagne to-dorado text-fondo bg-gradient-to-br shadow-[0_0_30px_rgba(201,169,110,0.35)]' : 'bg-campo text-suave'}`}>
            <Icon name="fuego" size={38} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="titulo text-5xl leading-none">
              {racha.dias} <span className="text-suave font-sans text-base font-medium">{racha.dias === 1 ? 'día' : 'días'}</span>
            </p>
            <p className="text-suave mt-1 text-xs">Días seguidos con {Math.round(UMBRAL_RACHA * 100)} % o más de tus hábitos</p>
            <p className="text-champagne mt-1 text-xs font-semibold">Mejor racha: {mejor} {mejor === 1 ? 'día' : 'días'}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-suave mb-1.5 flex justify-between text-xs">
            <span>
              Próximo logro: <b className="text-texto">{nombreHito(sig)}</b>
            </span>
            <span>
              {sig - racha.dias === 1 ? 'falta 1 día' : `faltan ${sig - racha.dias} días`}
            </span>
          </div>
          <div className="bg-campo h-2 overflow-hidden rounded-full">
            <div className="from-champagne to-dorado h-full rounded-full bg-gradient-to-r transition-all duration-700" style={{ width: `${Math.max(progreso * 100, 3)}%` }} />
          </div>
          {!racha.hoyCuenta && racha.dias > 0 && activos.length > 0 && (
            <p className="text-champagne/90 mt-3 text-xs">Completa hoy al menos el {Math.round(UMBRAL_RACHA * 100)} % para mantener tu racha 🔥</p>
          )}
        </div>

        <div className="mt-5 flex justify-around">
          {visibles.map((h) => (
            <Medalla key={h} hito={h} ganada={mejor >= h} tam="sm" />
          ))}
        </div>
      </section>

      <Sheet abierto={abierta} onCerrar={() => setAbierta(false)} titulo="Logros de racha">
        <LogrosDetalle mejor={mejor} />
      </Sheet>
    </>
  );
}

function LogrosDetalle({ mejor }: { mejor: number }) {
  const logros = useLiveQuery(() => db.logros.orderBy('fecha').reverse().toArray(), []) ?? [];
  return (
    <div>
      <p className="text-suave mb-5 text-sm">
        Un día cuenta para tu racha cuando cumples al menos el {Math.round(UMBRAL_RACHA * 100)} % de tus hábitos. Celebramos el primer día, la primera semana, los 15 días, el
        primer mes y después cada mes.
      </p>
      <div className="mb-6 grid grid-cols-4 gap-y-5">
        {hitosHasta(mejor).map((h) => (
          <Medalla key={h} hito={h} ganada={mejor >= h} />
        ))}
      </div>
      {logros.length > 0 && (
        <>
          <h3 className="etiqueta">Historial</h3>
          <ul className="divide-y divide-white/5">
            {logros.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <Icon name="fuego" size={16} className="text-dorado" /> {nombreHito(l.hito)} de racha
                </span>
                <span className="text-suave text-xs">{fechaRelativa(l.fecha)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
