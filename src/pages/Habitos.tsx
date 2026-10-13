import { useMemo, useState } from 'react';
import { db, type Habito } from '../lib/db';
import { diaCorto, fechaLarga, fromISO, hoyISO, inicioSemana, sumarDias } from '../lib/dates';
import { useHabitos, useRegistros } from '../lib/hooks';
import { cumplimientoHabito, porcentajeDia, rachaDiasCompletos, rachaHabito } from '../lib/stats';
import { HabitoFila } from '../components/HabitoFila';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Anillo, BotonAgregar, Encabezado, Vacio } from '../components/ui';

export default function Habitos() {
  const { todos, activos } = useHabitos();
  const idx = useRegistros();
  const hoy = hoyISO();
  const [fecha, setFecha] = useState(hoy);
  const [semana, setSemana] = useState(inicioSemana(hoy));
  const [editar, setEditar] = useState(false);

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(semana, i));
  const hechos = idx.get(fecha) ?? new Set<number>();
  const pct = porcentajeDia(fecha, activos, idx);
  const completados = activos.filter((h) => hechos.has(h.id!)).length;
  const racha = rachaDiasCompletos(activos, idx);

  const irSemana = (delta: number) => {
    const nueva = sumarDias(semana, delta * 7);
    if (nueva > hoy) return;
    setSemana(nueva);
    setFecha(delta > 0 && sumarDias(nueva, 6) >= hoy ? hoy : sumarDias(nueva, delta > 0 ? 0 : 6));
  };

  return (
    <>
      <Encabezado
        subtitulo="Constancia diaria"
        titulo="Hábitos"
        accion={
          <button className="btn-sec !py-2.5" onClick={() => setEditar(true)}>
            <Icon name="editar" size={16} /> Editar
          </button>
        }
      />

      {/* Semana */}
      <section className="tarjeta animate-entrada mb-4 !p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <button onClick={() => irSemana(-1)} className="text-suave hover:text-texto rounded-full p-1.5" aria-label="Semana anterior">
            <Icon name="izq" size={18} />
          </button>
          <span className="text-suave text-xs font-medium first-letter:uppercase">{fechaLarga(fecha)}</span>
          <button
            onClick={() => irSemana(1)}
            disabled={sumarDias(semana, 7) > hoy}
            className="text-suave hover:text-texto rounded-full p-1.5 disabled:opacity-20"
            aria-label="Semana siguiente"
          >
            <Icon name="der" size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const futuro = d > hoy;
            const p = porcentajeDia(d, activos, idx);
            const sel = d === fecha;
            return (
              <button
                key={d}
                disabled={futuro}
                onClick={() => setFecha(d)}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition ${sel ? 'bg-dorado/15' : 'hover:bg-white/5'} disabled:opacity-25`}
              >
                <span className={`text-[10px] font-semibold uppercase ${sel ? 'text-dorado' : 'text-suave'}`}>{diaCorto(d)}</span>
                <Anillo progreso={p} tam={34} grosor={3.5}>
                  <span className={`text-xs font-semibold ${d === hoy ? 'text-dorado' : ''}`}>{fromISO(d).getDate()}</span>
                </Anillo>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lista del día */}
      <section className="tarjeta animate-entrada mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="titulo text-2xl leading-none">{fecha === hoy ? 'Hoy' : fechaLarga(fecha).split(',')[0]}</h2>
            <p className="text-suave mt-1 text-xs">
              {completados} de {activos.length} completados
            </p>
          </div>
          {racha > 0 && (
            <div className="bg-dorado/10 text-dorado flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
              <Icon name="fuego" size={14} /> Racha {racha}
            </div>
          )}
        </div>
        <div className="bg-campo mb-4 h-1.5 overflow-hidden rounded-full">
          <div className="from-champagne to-dorado h-full rounded-full bg-gradient-to-r transition-all duration-500" style={{ width: `${pct * 100}%` }} />
        </div>
        {pct === 1 && activos.length > 0 && (
          <p className="animate-entrada text-champagne mb-3 rounded-xl bg-white/[0.03] px-3 py-2 text-center text-sm font-medium">
            ¡Día completo! Así se construye el cambio. 🔥
          </p>
        )}
        {activos.length === 0 ? (
          <Vacio icono="habitos" titulo="Sin hábitos" texto="Crea tus hábitos para empezar a marcarlos cada día." accion={<BotonAgregar onClick={() => setEditar(true)} />} />
        ) : (
          <div className="flex flex-col gap-2">
            {activos.map((h) => (
              <HabitoFila key={h.id} habito={h} fecha={fecha} hecho={hechos.has(h.id!)} racha={rachaHabito(h.id!, idx)} />
            ))}
          </div>
        )}
      </section>

      {activos.length > 0 && mapaConstancia()}

      {activos.length > 0 && (
        <section className="tarjeta animate-entrada mb-4">
          <h2 className="titulo mb-1 text-2xl">Últimos 30 días</h2>
          <p className="text-suave mb-4 text-xs">Porcentaje de días que cumpliste cada hábito.</p>
          <div className="flex flex-col gap-3.5">
            {activos.map((h) => {
              const c = cumplimientoHabito(h.id!, idx, 30);
              return (
                <div key={h.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="truncate pr-2">
                      {h.emoji} {h.nombre}
                    </span>
                    <span className="text-champagne font-semibold tabular-nums">{Math.round(c * 100)}%</span>
                  </div>
                  <div className="bg-campo h-2 overflow-hidden rounded-full">
                    <div className="bg-dorado h-full rounded-full transition-all duration-700" style={{ width: `${c * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <EditorHabitos abierto={editar} onCerrar={() => setEditar(false)} habitos={todos} />
    </>
  );

  function mapaConstancia() {
    const SEMANAS = 15;
    const inicio = sumarDias(inicioSemana(hoy), -(SEMANAS - 1) * 7);
    const cols = Array.from({ length: SEMANAS }, (_, s) => Array.from({ length: 7 }, (_, d) => sumarDias(inicio, s * 7 + d)));
    const color = (p: number) =>
      p === 0 ? '#2B2B2B' : p < 0.34 ? 'rgba(201,169,110,0.3)' : p < 0.67 ? 'rgba(201,169,110,0.55)' : p < 1 ? 'rgba(201,169,110,0.8)' : '#E8D9B5';
    return (
      <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo mb-1 text-2xl">Mapa de constancia</h2>
        <p className="text-suave mb-4 text-xs">Cada cuadro es un día. Más brillante = más hábitos cumplidos.</p>
        <div className="flex gap-[3px]">
          <div className="text-suave mr-1 grid grid-rows-7 gap-[3px] text-[9px] leading-none">
            {['L', '', 'X', '', 'V', '', 'D'].map((l, i) => (
              <span key={i} className="flex aspect-square items-center">
                {l}
              </span>
            ))}
          </div>
          {cols.map((col, i) => (
            <div key={i} className="grid flex-1 grid-rows-7 gap-[3px]">
              {col.map((d) => (
                <button
                  key={d}
                  disabled={d > hoy}
                  onClick={() => {
                    setSemana(inicioSemana(d));
                    setFecha(d);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title={d}
                  className={`aspect-square rounded-[3px] ${d > hoy ? 'opacity-0' : ''} ${d === hoy ? 'ring-dorado ring-1' : ''}`}
                  style={{ background: color(porcentajeDia(d, activos, idx)) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="text-suave mt-3 flex items-center justify-end gap-1 text-[10px]">
          Menos
          {[0, 0.2, 0.5, 0.8, 1].map((p) => (
            <span key={p} className="size-2.5 rounded-[2px]" style={{ background: color(p) }} />
          ))}
          Más
        </div>
      </section>
    );
  }
}

const EMOJIS = ['💧', '👟', '🏋️', '🥩', '😴', '🥗', '🧘', '📖', '🚭', '🍎', '☀️', '🧠', '🚶', '🍳', '💊', '📵', '🙏', '✍️', '🏃', '🚴'];

function EditorHabitos({ abierto, onCerrar, habitos }: { abierto: boolean; onCerrar: () => void; habitos: Habito[] }) {
  const [nuevo, setNuevo] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const maxOrden = useMemo(() => habitos.reduce((m, h) => Math.max(m, h.orden), -1), [habitos]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    await db.habitos.add({ nombre: nuevo.trim(), emoji, orden: maxOrden + 1, activo: true });
    setNuevo('');
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
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Mis hábitos">
      <form onSubmit={agregar} className="mb-5">
        <label className="etiqueta">Nuevo hábito</label>
        <div className="flex gap-2">
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="campo !w-16 shrink-0 !px-2 text-center" aria-label="Ícono">
            {['✨', ...EMOJIS].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} className="campo" placeholder="Ej.: Estirar 10 minutos" maxLength={50} />
          <button className="btn-oro shrink-0 !px-3.5" aria-label="Agregar hábito" disabled={!nuevo.trim()}>
            <Icon name="mas" size={20} strokeWidth={2.4} />
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {habitos.map((h, i) => (
          <div key={h.id} className={`bg-campo/60 flex items-center gap-2 rounded-2xl p-2 ${h.activo ? '' : 'opacity-50'}`}>
            <select
              value={h.emoji}
              onChange={(e) => db.habitos.update(h.id!, { emoji: e.target.value })}
              className="w-12 shrink-0 appearance-none rounded-lg bg-black/25 py-2 text-center text-lg outline-none"
              aria-label="Ícono"
            >
              {[...new Set([h.emoji, '✨', ...EMOJIS])].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            <input
              defaultValue={h.nombre}
              onBlur={(e) => e.target.value.trim() && db.habitos.update(h.id!, { nombre: e.target.value.trim() })}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-2 text-sm outline-none focus:bg-black/20"
              maxLength={50}
              aria-label="Nombre del hábito"
            />
            <div className="flex shrink-0 items-center">
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-suave p-1.5 disabled:opacity-20" aria-label="Subir">
                <Icon name="arriba" size={16} />
              </button>
              <button onClick={() => mover(i, 1)} disabled={i === habitos.length - 1} className="text-suave p-1.5 disabled:opacity-20" aria-label="Bajar">
                <Icon name="abajo" size={16} />
              </button>
              <button
                onClick={() => db.habitos.update(h.id!, { activo: !h.activo })}
                className={`relative mx-1 h-6 w-10 rounded-full transition ${h.activo ? 'bg-dorado' : 'bg-[#444]'}`}
                aria-label={h.activo ? 'Pausar hábito' : 'Activar hábito'}
                title={h.activo ? 'Activo' : 'Pausado'}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${h.activo ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <button onClick={() => eliminar(h)} className="text-suave hover:text-sube p-1.5" aria-label="Eliminar">
                <Icon name="basura" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-suave mt-4 text-xs">Los hábitos pausados no cuentan para tu progreso diario, pero conservan su historial.</p>
    </Sheet>
  );
}
