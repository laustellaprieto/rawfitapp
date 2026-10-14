import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Rutina, type Sesion } from '../lib/db';
import { fechaCorta, fechaRelativa, toISO } from '../lib/fechas';
import { abrirPdf, diaDeHoy, estadoRutina, planVigente, sesionDesdeRutina, textoFechas, textoObjetivo } from '../lib/rutinas';
import { Icon } from './Icon';

/** Rutinas que asignó la coach, con botón para empezar la sesión. */
export function TuPlanEntreno({ onEmpezar }: { onEmpezar: (s: Sesion) => void }) {
  const plan = useLiveQuery(planVigente, []);
  const [abierta, setAbierta] = useState<string>();
  if (!plan || (!plan.vigentes.length && !plan.proximo)) return null;
  const { vigentes: rutinas, proximo } = plan;
  const hoy = diaDeHoy();
  // Bloques en curso (ej. "Semana 2 · Del 13 oct al 19 oct").
  const bloques = [...new Map(rutinas.filter((r) => r.bloque || r.inicio || r.fin).map((r) => [`${r.bloque}|${r.inicio}|${r.fin}`, r])).values()];
  return (
    <section className="tarjeta animate-entrada !border-dorado/25 mb-4">
      <p className="text-dorado flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
        <Icon name="trofeo" size={14} /> Tu plan de entrenamiento
      </p>
      {bloques.map((b) => (
        <p key={`${b.bloque}|${b.inicio}|${b.fin}`} className="text-champagne mt-1 text-sm font-semibold">
          {b.bloque || 'Bloque actual'}
          {textoFechas(b) && <span className="text-suave font-normal"> · {textoFechas(b)}</span>}
        </p>
      ))}
      <p className="text-suave mt-0.5 mb-3 text-xs">
        {rutinas.length ? 'Lo preparó tu coach. Toca “Empezar” y anota tus series sobre el objetivo.' : 'Tu coach ya te preparó el siguiente bloque.'}
      </p>
      <div className="flex flex-col gap-2">
        {rutinas.map((r) => (
          <TarjetaRutina key={r.uid} r={r} esHoy={r.dia === hoy} abierta={abierta === r.uid} onAlternar={() => setAbierta(abierta === r.uid ? undefined : r.uid)} onEmpezar={() => onEmpezar(sesionDesdeRutina(r))} />
        ))}
      </div>
      {proximo && (
        <p className="bg-campo/50 text-suave mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
          <Icon name="calendario" size={16} className="text-dorado shrink-0" />
          <span>
            Próximo: <b className="text-texto">{proximo.nombre || 'nuevo bloque'}</b>, empieza el {fechaCorta(proximo.inicio)}.
          </span>
        </p>
      )}
    </section>
  );
}

function TarjetaRutina({ r, esHoy, abierta, onAlternar, onEmpezar }: { r: Rutina; esHoy: boolean; abierta: boolean; onAlternar: () => void; onEmpezar: () => void }) {
  return (
    <div className={`rounded-2xl border p-3 ${esHoy ? 'border-dorado/40 bg-dorado/[0.06]' : 'bg-campo/50 border-transparent'}`}>
      <div className="flex items-center gap-3">
        <button onClick={onAlternar} className="min-w-0 flex-1 text-left" aria-expanded={abierta}>
          <p className="font-semibold">
            {r.nombre}
            {esHoy && <span className="bg-dorado text-fondo ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold">HOY</span>}
          </p>
          <p className="text-suave text-xs">
            {r.dia ? `${r.dia} · ` : ''}
            {r.ejercicios.length} {r.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} · {abierta ? 'ocultar' : 'ver detalle'}
          </p>
        </button>
        <button onClick={onEmpezar} className="btn-oro shrink-0 !px-3 !py-2 text-xs">
          Empezar
        </button>
      </div>
      {abierta && (
        <ul className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
          {r.ejercicios.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{e.nombre}</span>
              <span className="text-champagne block text-xs">{textoObjetivo(e)}</span>
              {e.nota && <span className="text-suave block text-xs italic">{e.nota}</span>}
            </li>
          ))}
          {r.notas && <li className="text-suave text-xs italic">“{r.notas}”</li>}
        </ul>
      )}
    </div>
  );
}

/** En Hoy: la rutina que toca hoy (si la coach le puso día). */
export function EntrenoDeHoy({ onEmpezar }: { onEmpezar: (r: Rutina) => void }) {
  const rutina = useLiveQuery(() => db.rutinas.orderBy('orden').filter((r) => r.dia === diaDeHoy() && estadoRutina(r) === 'vigente').first(), []);
  if (!rutina) return null;
  return (
    <button onClick={() => onEmpezar(rutina)} className="tarjeta animate-entrada !border-dorado/30 mb-4 flex w-full items-center gap-3 text-left">
      <span className="bg-dorado text-fondo grid size-11 shrink-0 place-items-center rounded-xl">
        <Icon name="entrenos" size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-dorado block text-[11px] font-semibold tracking-wider uppercase">Hoy te toca</span>
        <span className="block font-semibold">{rutina.nombre}</span>
        <span className="text-suave block text-xs">{rutina.ejercicios.map((e) => e.nombre).join(' · ')}</span>
      </span>
      <Icon name="der" size={18} className="text-dorado" />
    </button>
  );
}

/** Guía de alimentación en PDF que subió la coach. */
export function TarjetaNutricion({ mostrarVacia = false }: { mostrarVacia?: boolean }) {
  const planes = useLiveQuery(() => db.nutricion.toArray(), []);
  if (!planes) return null;
  if (!planes.length)
    return mostrarVacia ? (
      <section className="tarjeta animate-entrada mb-6 flex items-center gap-3 !p-3.5">
        <span className="bg-campo text-suave grid size-10 shrink-0 place-items-center rounded-xl">
          <Icon name="documento" size={20} />
        </span>
        <p className="text-suave text-sm">Cuando tu coach te comparta tu guía de alimentación, la verás aquí.</p>
      </section>
    ) : null;
  const ordenados = [...planes].sort((a, b) => b.subidoEn.localeCompare(a.subidoEn));
  return (
    <section className="tarjeta animate-entrada mb-4">
      <p className="text-dorado flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
        <Icon name="documento" size={14} /> Tu guía de alimentación
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {ordenados.map((n, i) => (
          <button key={n.uid} onClick={() => abrirPdf(n)} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/5">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i === 0 ? 'bg-dorado/15 text-dorado' : 'bg-campo text-suave'}`}>
              <Icon name="documento" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{n.nombre}</span>
              <span className="text-suave block text-xs">
                {i === 0 ? 'Guía actual · ' : ''}subido {fechaRelativa(toISO(new Date(n.subidoEn))).toLowerCase()}
              </span>
            </span>
            <span className="text-dorado text-xs font-semibold">Abrir</span>
          </button>
        ))}
      </div>
    </section>
  );
}
