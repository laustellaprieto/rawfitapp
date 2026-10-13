import { useEffect, useRef, useState } from 'react';
import { toggleHabito, type Habito } from '../lib/db';
import { diasDelMes, fromISO, hoyISO, letraDia, mesDe, nombreMes, sumarMeses } from '../lib/fechas';
import { porcentajeDia, UMBRAL_RACHA, type IndiceRegistros } from '../lib/habitos';
import { useHabitos, useRegistros } from '../lib/hooks';
import { Icon } from '../components/Icon';
import { Encabezado } from '../components/ui';
import type { Ir } from '../App';

const pctTexto = (p: number) => `${Math.round(p * 100)}%`;

/** Color de fondo según el % (cuanto más alto, más dorado). */
const tono = (p: number) => (p >= 1 ? 'text-fondo bg-champagne' : p >= UMBRAL_RACHA ? 'text-fondo bg-dorado' : p >= 0.5 ? 'text-champagne bg-dorado/25' : p > 0 ? 'text-suave bg-white/5' : 'text-suave/50');

export default function Habitos({ ir }: { ir: Ir }) {
  const { activos } = useHabitos();
  const idx = useRegistros();
  const hoy = hoyISO();
  const [mes, setMes] = useState(mesDe(hoy));

  const dias = diasDelMes(mes);
  const diasHastaHoy = dias.filter((d) => d <= hoy);
  const esFuturo = mes > mesDe(hoy);

  const pctHabito = (h: Habito) => (diasHastaHoy.length ? diasHastaHoy.filter((d) => idx.get(d)?.has(h.id!)).length / diasHastaHoy.length : 0);
  const pctGlobal = diasHastaHoy.length && activos.length ? diasHastaHoy.reduce((s, d) => s + porcentajeDia(d, activos, idx), 0) / diasHastaHoy.length : 0;
  const diasRacha = diasHastaHoy.filter((d) => porcentajeDia(d, activos, idx) >= UMBRAL_RACHA - 1e-9).length;

  return (
    <>
      <Encabezado
        subtitulo="Constancia diaria"
        titulo="Hábitos"
        accion={
          <button className="btn-sec !py-2.5" onClick={() => ir('ajustes')}>
            <Icon name="editar" size={16} /> Editar
          </button>
        }
      />

      {/* Selector de mes */}
      <div className="tarjeta animate-entrada mb-4 flex items-center justify-between !p-2">
        <button onClick={() => setMes(sumarMeses(mes, -1))} className="text-suave hover:text-texto rounded-xl p-2.5" aria-label="Mes anterior">
          <Icon name="izq" size={20} />
        </button>
        <div className="text-center">
          <p className="titulo text-2xl leading-none">{nombreMes(mes)}</p>
          {mes !== mesDe(hoy) && (
            <button onClick={() => setMes(mesDe(hoy))} className="text-dorado mt-0.5 text-[11px] font-semibold">
              Ir al mes actual
            </button>
          )}
        </div>
        <button
          onClick={() => setMes(sumarMeses(mes, 1))}
          disabled={mes >= mesDe(hoy)}
          className="text-suave hover:text-texto rounded-xl p-2.5 disabled:opacity-20"
          aria-label="Mes siguiente"
        >
          <Icon name="der" size={20} />
        </button>
      </div>

      {/* Resumen del mes */}
      <div className="animate-entrada mb-4 grid grid-cols-2 gap-3">
        <div className="tarjeta">
          <p className="text-suave text-[11px] font-medium tracking-wider uppercase">Cumplimiento del mes</p>
          <p className="titulo text-dorado mt-1 text-4xl leading-none">{esFuturo ? '—' : pctTexto(pctGlobal)}</p>
          <div className="bg-campo mt-2 h-1.5 overflow-hidden rounded-full">
            <div className="bg-dorado h-full rounded-full transition-all duration-700" style={{ width: `${pctGlobal * 100}%` }} />
          </div>
        </div>
        <div className="tarjeta">
          <p className="text-suave text-[11px] font-medium tracking-wider uppercase">Días con ≥ 80 %</p>
          <p className="titulo mt-1 text-4xl leading-none">
            {diasRacha}
            <span className="text-suave font-sans text-sm"> / {diasHastaHoy.length}</span>
          </p>
          <p className="text-suave mt-1 text-xs">cuentan para tu racha</p>
        </div>
      </div>

      {activos.length === 0 ? (
        <p className="tarjeta text-suave text-center text-sm">No tienes hábitos activos. Agrégalos desde Ajustes.</p>
      ) : (
        <Cuadricula activos={activos} idx={idx} dias={dias} hoy={hoy} pctHabito={pctHabito} />
      )}

      <p className="text-suave mt-3 px-1 text-xs">Toca una celda para marcar o desmarcar. Desliza la tabla hacia los lados para ver todo el mes.</p>
    </>
  );
}

function Cuadricula({
  activos,
  idx,
  dias,
  hoy,
  pctHabito,
}: {
  activos: Habito[];
  idx: IndiceRegistros;
  dias: string[];
  hoy: string;
  pctHabito: (h: Habito) => number;
}) {
  const CELDA = 'w-9 min-w-9';
  const caja = useRef<HTMLDivElement>(null);
  const mes = dias[0];

  // En el mes actual, desplaza la tabla para que hoy quede a la vista (con los días anteriores a su izquierda).
  useEffect(() => {
    const el = caja.current?.querySelector<HTMLElement>('[data-hoy]');
    if (caja.current && el) caja.current.scrollLeft = el.offsetLeft + el.offsetWidth + 56 - caja.current.clientWidth;
    else if (caja.current) caja.current.scrollLeft = 0;
  }, [mes]);

  return (
    <section className="tarjeta animate-entrada !p-0">
      <div ref={caja} className="scroll-x overflow-x-auto rounded-3xl">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="bg-tarjeta sticky left-0 z-10 w-28 min-w-28 px-3 pt-3 pb-2 text-left align-bottom">
                <span className="text-suave text-[10px] font-semibold tracking-wider uppercase">Hábito</span>
              </th>
              {dias.map((d) => (
                <th key={d} data-hoy={d === hoy || undefined} className={`${CELDA} pt-3 pb-2 text-center font-semibold ${d === hoy ? 'text-dorado' : 'text-suave'}`}>
                  <span className="block text-[9px] opacity-80">{letraDia(d)}</span>
                  <span className={`mx-auto mt-0.5 grid size-6 place-items-center rounded-full ${d === hoy ? 'bg-dorado text-fondo' : ''}`}>{fromISO(d).getDate()}</span>
                </th>
              ))}
              <th className="text-champagne bg-tarjeta sticky right-0 z-10 min-w-12 px-2 pt-3 pb-2 text-center text-[10px] font-semibold uppercase">%</th>
            </tr>
          </thead>
          <tbody>
            {activos.map((h) => (
              <tr key={h.id}>
                <th scope="row" className="bg-tarjeta sticky left-0 z-10 w-28 max-w-28 border-t border-white/5 py-1.5 pr-1 pl-3 text-left text-[11px] font-medium">
                  <span className="line-clamp-2 leading-tight">
                    {h.emoji} {h.nombre}
                  </span>
                </th>
                {dias.map((d) => {
                  const futuro = d > hoy;
                  const hecho = !!idx.get(d)?.has(h.id!);
                  return (
                    <td key={d} className={`${CELDA} border-t border-white/5 p-0.5 text-center`}>
                      <button
                        disabled={futuro}
                        onClick={() => toggleHabito(h.id!, d).then((on) => on && navigator.vibrate?.(8))}
                        aria-label={`${h.nombre}, ${d}${hecho ? ', cumplido' : ''}`}
                        aria-pressed={hecho}
                        className={`mx-auto grid size-7 place-items-center rounded-lg transition-all duration-200 active:scale-90 ${
                          hecho ? 'bg-dorado text-fondo animate-pop' : futuro ? 'bg-white/[0.02]' : 'bg-campo hover:bg-[#363636]'
                        } ${d === hoy && !hecho ? 'ring-dorado/50 ring-1' : ''}`}
                      >
                        {hecho && <Icon name="check" size={14} strokeWidth={3.2} />}
                      </button>
                    </td>
                  );
                })}
                <td className="bg-tarjeta sticky right-0 z-10 border-t border-white/5 px-1.5 text-center">
                  <span className={`inline-block min-w-10 rounded-md px-1 py-1 font-semibold tabular-nums ${tono(pctHabito(h))}`}>{pctTexto(pctHabito(h))}</span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="bg-tarjeta text-champagne sticky left-0 z-10 border-t border-white/10 px-3 py-2.5 text-left text-[10px] font-semibold uppercase">
                % del día
              </th>
              {dias.map((d) => {
                const p = porcentajeDia(d, activos, idx);
                return (
                  <td key={d} className={`${CELDA} border-t border-white/10 py-2 text-center`}>
                    {d <= hoy && <span className={`mx-auto block w-8 rounded-md py-1 text-[10px] font-semibold tabular-nums ${tono(p)}`}>{Math.round(p * 100)}</span>}
                  </td>
                );
              })}
              <td className="bg-tarjeta sticky right-0 z-10 border-t border-white/10" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
