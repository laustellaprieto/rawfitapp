import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { calcularCalorias, kcal, macrosDelPerfil, textoMeta } from '../lib/calorias';
import { db, guardarPerfil, type Perfil } from '../lib/db';
import { num } from '../lib/format';
import { EditorCalorias } from './Calorias';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** Tarjeta de calorías en Hoy: objetivo diario o invitación a calcularlo. */
export function CaloriasHoy({ perfil }: { perfil: Perfil }) {
  const [abierto, setAbierto] = useState(false);
  const ultimoPeso = useLiveQuery(() => db.mediciones.orderBy('fecha').filter((m) => m.peso !== undefined).last(), [])?.peso;
  const r = calcularCalorias(perfil);
  const m = macrosDelPerfil(perfil);
  const pesoCambio = r && ultimoPeso !== undefined && perfil.peso !== undefined && Math.abs(ultimoPeso - perfil.peso) >= 0.5;

  return (
    <>
      <section className="tarjeta animate-entrada mb-4">
        {r ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-suave text-[11px] font-medium tracking-wider uppercase">Calorías del día</p>
                <p className="titulo text-champagne mt-1 text-4xl leading-none">
                  {r.objetivo.toLocaleString('es')}
                  <span className="text-suave ml-1 font-sans text-sm font-medium">kcal</span>
                </p>
                <p className="text-suave mt-1 text-xs">
                  {textoMeta(r)} · mantenimiento {kcal(r.mantenimiento)}
                </p>
              </div>
              <button onClick={() => setAbierto(true)} className="btn-sec shrink-0 !py-2.5" aria-label="Editar calorías">
                <Icon name="editar" size={16} /> Ajustar
              </button>
            </div>
            {m && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    ['Proteína', m.proteina.gramos, '#C9A96E'],
                    ['Carbohidratos', m.carbos.gramos, '#F2F2F2'],
                    ['Grasa', m.grasa.gramos, '#8C8C8C'],
                  ] as const
                ).map(([n, g, c]) => (
                  <div key={n} className="bg-campo/60 rounded-xl px-2.5 py-2">
                    <p className="text-suave flex items-center gap-1.5 text-[10px] font-medium">
                      <span className="size-2 rounded-full" style={{ background: c }} />
                      {n}
                    </p>
                    <p className="titulo mt-0.5 text-2xl leading-none">
                      {g}
                      <span className="text-suave ml-0.5 font-sans text-[10px] font-medium">g</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
            {pesoCambio && (
              <button
                onClick={() => guardarPerfil({ peso: ultimoPeso })}
                className="bg-dorado/10 text-dorado mt-3 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold"
              >
                <span>
                  Tu peso cambió a {num(ultimoPeso)} kg. Recalcular tus calorías
                </span>
                <Icon name="der" size={16} />
              </button>
            )}
          </>
        ) : (
          <button onClick={() => setAbierto(true)} className="flex w-full items-center gap-3 text-left">
            <span className="bg-dorado/12 text-dorado grid size-10 shrink-0 place-items-center rounded-xl">
              <Icon name="fuego" size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Calcula tus calorías</span>
              <span className="text-suave block text-xs">Basales, mantenimiento y tu meta: definición, volumen o mantenimiento.</span>
            </span>
            <Icon name="der" size={18} className="text-dorado" />
          </button>
        )}
      </section>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Tus calorías">
        {abierto && <EditorCalorias perfil={perfil} onCerrar={() => setAbierto(false)} />}
      </Sheet>
    </>
  );
}
