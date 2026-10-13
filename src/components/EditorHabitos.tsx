import { useMemo, useState } from 'react';
import { EMOJIS_HABITO } from '../data/habitos';
import { db, type Habito } from '../lib/db';
import { Icon } from './Icon';

/** Lista editable de hábitos: agregar, renombrar, cambiar emoji, ordenar, pausar y eliminar. */
export function EditorHabitos({ habitos }: { habitos: Habito[] }) {
  const [nuevo, setNuevo] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const maxOrden = useMemo(() => habitos.reduce((m, h) => Math.max(m, h.orden), -1), [habitos]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
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
        {habitos.map((h, i) => (
          <div key={h.id} className={`bg-campo/60 flex items-center gap-1.5 rounded-2xl p-1.5 transition ${h.activo ? '' : 'opacity-45'}`}>
            <select
              value={h.emoji}
              onChange={(e) => db.habitos.update(h.id!, { emoji: e.target.value })}
              className="w-11 shrink-0 appearance-none rounded-xl bg-black/25 py-2 text-center text-lg outline-none"
              aria-label="Emoji del hábito"
            >
              {[...new Set([h.emoji, ...EMOJIS_HABITO])].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
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
        ))}
      </div>

      <form onSubmit={agregar} className="mt-4">
        <label className="etiqueta" htmlFor="nuevo-habito">Agregar hábito</label>
        <div className="flex gap-2">
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="campo !w-14 shrink-0 appearance-none !px-0 text-center text-lg" aria-label="Emoji">
            {EMOJIS_HABITO.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <input id="nuevo-habito" value={nuevo} onChange={(e) => setNuevo(e.target.value)} className="campo" placeholder="Ej.: Estirar 10 minutos" maxLength={50} />
          <button className="btn-oro shrink-0 !px-3.5" aria-label="Agregar hábito" disabled={!nuevo.trim()}>
            <Icon name="mas" size={20} strokeWidth={2.4} />
          </button>
        </div>
      </form>
      <p className="text-suave mt-3 text-xs">Toca el emoji o el nombre para cambiarlos. El interruptor pausa un hábito sin borrar su historial.</p>
    </div>
  );
}
