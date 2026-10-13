import { useMemo, useState } from 'react';
import { db, type EjercicioSesion, type Sesion } from '../../lib/db';
import { hoyISO } from '../../lib/fechas';
import { numTxt, parseNum } from '../../lib/format';
import { formatoVolumen, volumenSerie } from '../../lib/entreno';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Buscador } from './Buscador';

type SerieTxt = { reps: string; peso: string; rir: string };
type EjTxt = { ejercicioId: string; nombre: string; grupo: string; series: SerieTxt[] };

const aTxt = (e: EjercicioSesion): EjTxt => ({
  ...e,
  series: e.series.map((s) => ({ reps: numTxt(s.reps), peso: numTxt(s.peso), rir: numTxt(s.rir) })),
});
const serieVacia = (): SerieTxt => ({ reps: '', peso: '', rir: '' });
const aSerie = (s: SerieTxt) => ({ reps: parseNum(s.reps), peso: parseNum(s.peso), rir: parseNum(s.rir) });

export function FormSesion({ sesion, historial, onCerrar }: { sesion: Sesion; historial: Sesion[]; onCerrar: () => void }) {
  const [fecha, setFecha] = useState(sesion.fecha);
  const [nombre, setNombre] = useState(sesion.nombre);
  const [ejercicios, setEjercicios] = useState<EjTxt[]>(sesion.ejercicios.map(aTxt));
  const [notas, setNotas] = useState(sesion.notas ?? '');
  const [buscando, setBuscando] = useState(false);

  const nombresPrevios = useMemo(() => [...new Set(historial.map((s) => s.nombre))], [historial]);
  const anteriorMismoNombre = historial.find((s) => s.id !== sesion.id && s.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && s.ejercicios.length);
  const volumenTotal = ejercicios.reduce((t, e) => t + e.series.reduce((u, s) => u + volumenSerie(aSerie(s)), 0), 0);

  const cambiarSerie = (i: number, j: number, k: keyof SerieTxt, v: string) =>
    setEjercicios((es) => es.map((e, a) => (a !== i ? e : { ...e, series: e.series.map((s, b) => (b === j ? { ...s, [k]: v } : s)) })));
  const agregarSerie = (i: number) =>
    setEjercicios((es) => es.map((e, a) => (a !== i ? e : { ...e, series: [...e.series, { ...(e.series[e.series.length - 1] ?? serieVacia()) }] })));
  const quitarSerie = (i: number, j: number) => setEjercicios((es) => es.map((e, a) => (a !== i ? e : { ...e, series: e.series.filter((_, b) => b !== j) })));
  const mover = (i: number, d: -1 | 1) =>
    setEjercicios((es) => {
      const n = [...es];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const s: Sesion = {
      fecha,
      nombre: nombre.trim() || 'Entreno',
      notas: notas.trim() || undefined,
      ejercicios: ejercicios.map((e) => ({ ...e, series: e.series.map(aSerie).filter((x) => x.reps !== undefined || x.peso !== undefined) })),
    };
    if (sesion.id) await db.sesiones.put({ ...s, id: sesion.id });
    else await db.sesiones.add(s);
    onCerrar();
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    await db.sesiones.delete(sesion.id!);
    onCerrar();
  };

  return (
    <>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="etiqueta" htmlFor="s-nombre">Nombre</label>
            <input id="s-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} list="sesiones-previas" className="campo" placeholder="Ej.: Pierna A" maxLength={40} />
            <datalist id="sesiones-previas">
              {nombresPrevios.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="s-fecha">Fecha</label>
            <input id="s-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo !w-40" required />
          </div>
        </div>

        {ejercicios.length === 0 && anteriorMismoNombre && (
          <button type="button" onClick={() => setEjercicios(anteriorMismoNombre.ejercicios.map(aTxt))} className="bg-dorado/10 text-dorado rounded-xl px-3 py-2.5 text-sm font-semibold">
            Repetir ejercicios de la última “{anteriorMismoNombre.nombre}”
          </button>
        )}

        <div className="flex flex-col gap-3">
          {ejercicios.map((e, i) => {
            const vol = e.series.reduce((t, s) => t + volumenSerie(aSerie(s)), 0);
            return (
              <div key={`${e.ejercicioId}-${i}`} className="bg-campo/50 rounded-2xl p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{e.nombre}</p>
                    <p className="text-suave text-xs">
                      {e.grupo} · Volumen <b className="text-champagne">{formatoVolumen(vol)}</b>
                    </p>
                  </div>
                  <div className="text-suave flex shrink-0">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-20" aria-label="Subir ejercicio">
                      <Icon name="arriba" size={16} />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === ejercicios.length - 1} className="p-1 disabled:opacity-20" aria-label="Bajar ejercicio">
                      <Icon name="abajo" size={16} />
                    </button>
                    <button type="button" onClick={() => setEjercicios((es) => es.filter((_, a) => a !== i))} className="hover:text-sube p-1" aria-label={`Quitar ${e.nombre}`}>
                      <Icon name="basura" size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-suave grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-1.5 px-0.5 pb-1 text-center text-[10px] font-semibold uppercase">
                  <span>#</span>
                  <span>Reps</span>
                  <span>Kg</span>
                  <span>RIR</span>
                  <span />
                </div>
                <div className="flex flex-col gap-1.5">
                  {e.series.map((s, j) => (
                    <div key={j} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] items-center gap-1.5">
                      <span className="text-suave text-center text-xs font-semibold">{j + 1}</span>
                      {(['reps', 'peso', 'rir'] as const).map((k) => (
                        <input
                          key={k}
                          value={s[k]}
                          onChange={(ev) => cambiarSerie(i, j, k, ev.target.value)}
                          inputMode={k === 'peso' ? 'decimal' : 'numeric'}
                          className="campo !rounded-lg !bg-black/25 !px-1 !py-2 text-center tabular-nums"
                          placeholder="—"
                          aria-label={`Serie ${j + 1}: ${k === 'peso' ? 'peso en kg' : k === 'rir' ? 'RIR' : 'repeticiones'}`}
                        />
                      ))}
                      <button type="button" onClick={() => quitarSerie(i, j)} className="text-suave hover:text-sube grid place-items-center" aria-label={`Quitar serie ${j + 1}`}>
                        <Icon name="cerrar" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => agregarSerie(i)} className="text-dorado mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                  <Icon name="mas" size={14} /> Agregar serie
                </button>
              </div>
            );
          })}

          <button type="button" onClick={() => setBuscando(true)} className="btn-sec w-full border border-dashed border-white/10">
            <Icon name="buscar" size={18} /> Agregar ejercicio
          </button>
        </div>

        <p className="text-suave -mt-1 text-xs">
          <b className="text-texto">RIR</b> = repeticiones en reserva: cuántas más podrías haber hecho con buena técnica.
        </p>

        <div>
          <label className="etiqueta" htmlFor="s-notas">Notas</label>
          <textarea id="s-notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="campo min-h-16 resize-none" placeholder="¿Cómo te sentiste?" />
        </div>

        <div className="bg-dorado/10 flex items-center justify-between rounded-xl px-4 py-3">
          <span className="text-suave text-sm">Volumen de la sesión</span>
          <span className="titulo text-champagne text-2xl leading-none">{formatoVolumen(volumenTotal)}</span>
        </div>

        <div className="flex gap-2">
          {sesion.id && (
            <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar sesión">
              <Icon name="basura" size={18} />
            </button>
          )}
          <button className="btn-oro flex-1" disabled={!fecha || ejercicios.length === 0}>
            Guardar sesión
          </button>
        </div>
      </form>

      <Sheet abierto={buscando} onCerrar={() => setBuscando(false)} titulo="Agregar ejercicio">
        <Buscador
          onElegir={(e) => {
            setEjercicios((es) => [...es, { ejercicioId: e.id, nombre: e.nombre, grupo: e.grupo, series: [serieVacia()] }]);
            setBuscando(false);
          }}
        />
      </Sheet>
    </>
  );
}
