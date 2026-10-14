import { useMemo, useState } from 'react';
import { EMOJIS_HABITO } from '../data/habitos';
import { db, type Habito } from '../lib/db';
import { Icon } from './Icon';

/** Lista editable de hábitos: agregar, renombrar, cambiar emoji, ordenar, pausar y eliminar. */
export function EditorHabitos({ habitos }: { habitos: Habito[] }) {
  const [nuevo, setNuevo] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const maxOrden = useMemo(() => habitos.reduce((m, h) => Math.max(m, h.orden), -1), [habitos]);

  // No es un <form>: este editor vive dentro del formulario del onboarding (los formularios no se pueden anidar).
  const agregar = async () => {
    if (!nuevo.trim()) return;
    await db.habitos.add({ nombre: nuevo.trim(), emoji, orden: maxOrden + 1, activo: true });
    setNuevo('');
    setEmoji('✨');
  };

  const mover = async (i: number, d: -1 | 1) => {
    const a = habitos[i];
    const b = habitos[i + d];
    if (!a || !b) return;
    await db.transaction('rw', db.habitos, async () => {
      await db.habitos.update(a.id!, { orden: b.orden });
      await db.habitos.update(b.id!, { orden: a.orden });
    });
  };

  const eliminar = async (h: Habito) => {
    if (!confirm(`¿Eliminar "${h.nombre}" y todo su historial?`)) return;
    await db.transaction('rw', db.habitos, db.registros, async () => {
      await db.registros.where('habitoId').equals(h.id!).delete();
      await db.habitos.delete(h.id!);
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        {habitos.map((h, i) =>
          h.origen === 'coach' ? (
            <div key={h.id} className="bg-dorado/[0.07] border-dorado/20 flex items-center gap-1.5 rounded-2xl border p-1.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/25 text-xl">{h.emoji}</span>
              <span className="min-w-0 flex-1 px-1.5 text-sm">
                {h.nombre}
                <span className="text-dorado block text-[10px] font-semibold">Asignado por tu coach</span>
              </span>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-suave p-1 disabled:opacity-20" aria-label="Subir">
                  <Icon name="arriba" size={16} />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === habitos.length - 1} className="text-suave p-1 disabled:opacity-20" aria-label="Bajar">
                  <Icon name="abajo" size={16} />
                </button>
                <Icon name="candado" size={16} className="text-dorado mx-2" aria-label="Solo tu coach puede cambiarlo" />
              </div>
            </div>
          ) : (
          <div key={h.id} className={`bg-campo/60 flex items-center gap-1.5 rounded-2xl p-1.5 transition ${h.activo ? '' : 'opacity-45'}`}>
            <SelectorEmoji
              valor={h.emoji}
              onChange={(e) => db.habitos.update(h.id!, { emoji: e })}
              className="size-10 rounded-xl bg-black/25"
              etiqueta={`Emoji de ${h.nombre}`}
            />
            <input
              key={h.nombre}
              defaultValue={h.nombre}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== h.nombre) db.habitos.update(h.id!, { nombre: v });
                else e.target.value = h.nombre;
              }}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-2 text-sm outline-none focus:bg-black/20"
              maxLength={50}
              aria-label="Nombre del hábito"
            />
            <div className="flex shrink-0 items-center">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-suave p-1 disabled:opacity-20" aria-label="Subir">
                <Icon name="arriba" size={16} />
              </button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === habitos.length - 1} className="text-suave p-1 disabled:opacity-20" aria-label="Bajar">
                <Icon name="abajo" size={16} />
              </button>
              <button
                type="button"
                onClick={() => db.habitos.update(h.id!, { activo: !h.activo })}
                className={`relative mx-1 h-6 w-10 rounded-full transition ${h.activo ? 'bg-dorado' : 'bg-[#444]'}`}
                aria-label={h.activo ? `Pausar ${h.nombre}` : `Activar ${h.nombre}`}
                aria-pressed={h.activo}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${h.activo ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <button type="button" onClick={() => eliminar(h)} className="text-suave hover:text-sube p-1" aria-label={`Eliminar ${h.nombre}`}>
                <Icon name="basura" size={16} />
              </button>
            </div>
          </div>
          ),
        )}
      </div>

      <div className="mt-4">
        <label className="etiqueta" htmlFor="nuevo-habito">Agregar hábito</label>
        <div className="flex gap-2">
          <SelectorEmoji valor={emoji} onChange={setEmoji} className="bg-campo size-12 rounded-xl" etiqueta="Emoji del nuevo hábito" />
          <input
            id="nuevo-habito"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregar();
              }
            }}
            className="campo"
            placeholder="Ej.: Estirar 10 minutos"
            maxLength={50}
          />
          <button type="button" onClick={agregar} className="btn-oro shrink-0 !px-3.5" aria-label="Agregar hábito" disabled={!nuevo.trim()}>
            <Icon name="mas" size={20} strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <p className="text-suave mt-3 text-xs">Toca el emoji o el nombre para cambiarlos. El interruptor pausa un hábito sin borrar su historial.</p>
    </div>
  );
}

/**
 * Muestra el emoji centrado y abre la lista nativa al tocarlo.
 * (El texto de un <select> no se puede centrar de forma fiable en iPhone,
 * así que el select va invisible encima del emoji).
 */
function SelectorEmoji({ valor, onChange, className, etiqueta }: { valor: string; onChange: (e: string) => void; className: string; etiqueta: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center text-xl leading-none ${className}`}>
      <span aria-hidden>{valor}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={etiqueta}>
        {[...new Set([valor, ...EMOJIS_HABITO])].map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>
    </span>
  );
}
