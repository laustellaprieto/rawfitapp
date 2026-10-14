import { useState } from 'react';
import type { EjercicioRutina, Rutina } from '../../lib/db';
import { numTxt, parseNum } from '../../lib/format';
import { DIAS_SEMANA } from '../../lib/rutinas';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Buscador } from '../entreno/Buscador';

type EjTxt = Omit<EjercicioRutina, 'series' | 'peso' | 'rir'> & { series: string; peso: string; rir: string };

/** Formulario de la coach para crear o editar una rutina de un cliente. */
export function EditorRutina({
  rutina,
  onGuardar,
  onBorrar,
  onCancelar,
}: {
  rutina: Rutina;
  onGuardar: (r: Rutina) => Promise<void>;
  onBorrar?: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(rutina.nombre);
  const [dia, setDia] = useState(rutina.dia ?? '');
  const [notas, setNotas] = useState(rutina.notas ?? '');
  const [ejs, setEjs] = useState<EjTxt[]>(rutina.ejercicios.map((e) => ({ ...e, series: numTxt(e.series), peso: numTxt(e.peso), rir: numTxt(e.rir), reps: e.reps ?? '' })));
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (i: number, k: keyof EjTxt, v: string) => setEjs((es) => es.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const mover = (i: number, d: -1 | 1) =>
    setEjs((es) => {
      const n = [...es];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar({
        ...rutina,
        nombre: nombre.trim(),
        dia: dia || undefined,
        notas: notas.trim() || undefined,
        ejercicios: ejs.map((x) => ({
          ejercicioId: x.ejercicioId,
          nombre: x.nombre,
          grupo: x.grupo,
          series: parseNum(x.series),
          reps: x.reps?.trim() || undefined,
          peso: parseNum(x.peso),
          rir: parseNum(x.rir),
          nota: x.nota?.trim() || undefined,
        })),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="etiqueta" htmlFor="r-nombre">Nombre</label>
            <input id="r-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Ej.: Pierna A" maxLength={40} required />
          </div>
          <div>
            <label className="etiqueta" htmlFor="r-dia">Día</label>
            <select id="r-dia" value={dia} onChange={(e) => setDia(e.target.value)} className="campo !w-36">
              <option value="">Cualquiera</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {ejs.map((e, i) => (
            <div key={`${e.ejercicioId}-${i}`} className="bg-campo/50 rounded-2xl p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{e.nombre}</p>
                  <p className="text-suave text-xs">{e.grupo}</p>
                </div>
                <div className="text-suave flex shrink-0">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-20" aria-label="Subir">
                    <Icon name="arriba" size={16} />
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === ejs.length - 1} className="p-1 disabled:opacity-20" aria-label="Bajar">
                    <Icon name="abajo" size={16} />
                  </button>
                  <button type="button" onClick={() => setEjs((x) => x.filter((_, j) => j !== i))} className="hover:text-sube p-1" aria-label={`Quitar ${e.nombre}`}>
                    <Icon name="basura" size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    ['series', 'Series', 'numeric', '4'],
                    ['reps', 'Reps', 'text', '8–10'],
                    ['peso', 'Kg', 'decimal', '—'],
                    ['rir', 'RIR', 'numeric', '2'],
                  ] as const
                ).map(([k, t, modo, ph]) => (
                  <label key={k} className="block">
                    <span className="text-suave mb-1 block text-center text-[10px] font-semibold uppercase">{t}</span>
                    <input value={e[k] ?? ''} onChange={(ev) => cambiar(i, k, ev.target.value)} inputMode={modo} placeholder={ph} className="campo !rounded-lg !bg-black/25 !px-1 !py-2 text-center" />
                  </label>
                ))}
              </div>
              <input value={e.nota ?? ''} onChange={(ev) => cambiar(i, 'nota', ev.target.value)} className="campo mt-1.5 !bg-black/25 !py-2 text-sm" placeholder="Indicación (opcional): tempo, descanso, técnica…" />
            </div>
          ))}
          <button type="button" onClick={() => setBuscando(true)} className="btn-sec w-full border border-dashed border-white/10">
            <Icon name="buscar" size={18} /> Agregar ejercicio
          </button>
        </div>

        <div>
          <label className="etiqueta" htmlFor="r-notas">Notas para tu cliente</label>
          <textarea id="r-notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="campo min-h-16 resize-none" placeholder="Calentamiento, descansos, enfoque de la semana…" />
        </div>

        <div className="flex gap-2">
          {onBorrar && (
            <button type="button" onClick={() => confirm('¿Borrar esta rutina del plan de tu cliente?') && onBorrar()} className="btn-peligro" aria-label="Borrar rutina">
              <Icon name="basura" size={18} />
            </button>
          )}
          <button type="button" onClick={onCancelar} className="btn-sec">
            Cancelar
          </button>
          <button className="btn-oro flex-1" disabled={guardando || !nombre.trim() || !ejs.length}>
            {guardando ? 'Guardando…' : 'Guardar rutina'}
          </button>
        </div>
      </form>

      <Sheet abierto={buscando} onCerrar={() => setBuscando(false)} titulo="Agregar ejercicio">
        <Buscador
          onElegir={(e) => {
            setEjs((x) => [...x, { ejercicioId: e.id, nombre: e.nombre, grupo: e.grupo, series: '3', reps: '10', peso: '', rir: '2' }]);
            setBuscando(false);
          }}
        />
      </Sheet>
    </>
  );
}
