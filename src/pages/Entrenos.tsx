import { useMemo, useState } from 'react';
import { db, type Ejercicio, type Entreno } from '../lib/db';
import { fechaCorta, fechaRelativa, hoyISO, inicioSemana, sumarDias } from '../lib/dates';
import { num, parseNum } from '../lib/format';
import { useAjustes, useEntrenos } from '../lib/hooks';
import { GraficaBarras } from '../components/Graficas';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { BotonAgregar, Encabezado, Stat, Vacio } from '../components/ui';

export const TIPOS = ['Fuerza', 'Cardio', 'HIIT', 'Movilidad', 'Deporte', 'Otro'];

export default function Entrenos() {
  const entrenos = useEntrenos();
  const ajustes = useAjustes();
  const [editando, setEditando] = useState<Entreno | null>(null);
  const lista = useMemo(() => entrenos ?? [], [entrenos]);
  const hoy = hoyISO();

  const semana = inicioSemana(hoy);
  const mes = hoy.slice(0, 7);
  const enSemana = lista.filter((e) => e.fecha >= semana).length;
  const delMes = lista.filter((e) => e.fecha.startsWith(mes));
  const minutosMes = delMes.reduce((s, e) => s + (e.duracion ?? 0), 0);

  const porSemana = Array.from({ length: 10 }, (_, i) => {
    const ini = sumarDias(semana, -(9 - i) * 7);
    const fin = sumarDias(ini, 7);
    return { x: fechaCorta(ini), y: lista.filter((e) => e.fecha >= ini && e.fecha < fin).length };
  });

  const nuevo = () => setEditando({ fecha: hoy, tipo: 'Fuerza', ejercicios: [] });

  return (
    <>
      <Encabezado subtitulo="Cada sesión suma" titulo="Entrenos" accion={<BotonAgregar onClick={nuevo}>Registrar</BotonAgregar>} />

      {entrenos !== undefined && lista.length === 0 ? (
        <Vacio
          icono="entrenos"
          titulo="Registra tu primer entreno"
          texto="Anota tipo, duración y ejercicios con series, repeticiones y peso. Así verás cómo progresas semana a semana."
          accion={<BotonAgregar onClick={nuevo}>Registrar entreno</BotonAgregar>}
        />
      ) : (
        <>
          <div className="animate-entrada mb-4 grid grid-cols-3 gap-3">
            <Stat etiqueta="Semana" valor={enSemana} extra={<span className="text-suave">sesiones</span>} />
            <Stat etiqueta="Mes" valor={delMes.length} extra={<span className="text-suave">sesiones</span>} />
            <Stat etiqueta="Minutos" valor={num(minutosMes, 0)} extra={<span className="text-suave">este mes</span>} />
          </div>

          <section className="tarjeta animate-entrada mb-4">
            <h2 className="titulo text-2xl">Entrenos por semana</h2>
            <p className="text-suave mb-3 text-xs">Últimas 10 semanas</p>
            <GraficaBarras datos={porSemana} unidad="entrenos" />
          </section>

          <section className="tarjeta animate-entrada">
            <h2 className="titulo mb-2 text-2xl">Historial</h2>
            <div className="flex flex-col divide-y divide-white/5">
              {lista.map((e) => (
                <button key={e.id} onClick={() => setEditando(e)} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-white/[0.03]">
                  <span className="bg-dorado/10 text-dorado grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon name="entrenos" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{e.tipo}</span>
                      <span className="text-suave text-xs">{fechaRelativa(e.fecha)}</span>
                    </span>
                    <span className="text-suave mt-0.5 flex flex-wrap gap-x-3 text-xs">
                      {e.duracion ? <span>{e.duracion} min</span> : null}
                      {e.esfuerzo ? <span>Esfuerzo {e.esfuerzo}/10</span> : null}
                      {e.ejercicios.length > 0 && <span>{e.ejercicios.length} ejercicios</span>}
                    </span>
                    {e.ejercicios.length > 0 && (
                      <span className="text-texto/80 mt-1.5 block truncate text-xs">
                        {e.ejercicios
                          .map((x) => `${x.nombre}${x.peso ? ` ${num(x.peso)}${ajustes.unidadPeso}` : ''}`)
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <Sheet abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar entreno' : 'Nuevo entreno'}>
        {editando && <FormEntreno key={editando.id ?? 'nuevo'} entreno={editando} historial={lista} onCerrar={() => setEditando(null)} />}
      </Sheet>
    </>
  );
}

type FilaEj = { nombre: string; series: string; reps: string; peso: string };
const aFila = (e: Ejercicio): FilaEj => ({ nombre: e.nombre, series: e.series?.toString() ?? '', reps: e.reps?.toString() ?? '', peso: e.peso?.toString() ?? '' });
const filaVacia = (): FilaEj => ({ nombre: '', series: '', reps: '', peso: '' });

function FormEntreno({ entreno, historial, onCerrar }: { entreno: Entreno; historial: Entreno[]; onCerrar: () => void }) {
  const ajustes = useAjustes();
  const [fecha, setFecha] = useState(entreno.fecha);
  const [tipo, setTipo] = useState(entreno.tipo);
  const [duracion, setDuracion] = useState(entreno.duracion?.toString() ?? '');
  const [esfuerzo, setEsfuerzo] = useState(entreno.esfuerzo ?? 0);
  const [filas, setFilas] = useState<FilaEj[]>(entreno.ejercicios.map(aFila));
  const [notas, setNotas] = useState(entreno.notas ?? '');

  const nombresPrevios = useMemo(() => [...new Set(historial.flatMap((e) => e.ejercicios.map((x) => x.nombre)))], [historial]);
  const ultimoMismoTipo = historial.find((e) => e.tipo === tipo && e.id !== entreno.id && e.ejercicios.length > 0);

  const cambiar = (i: number, k: keyof FilaEj, v: string) => setFilas((f) => f.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Entreno = {
      fecha,
      tipo: tipo.trim() || 'Otro',
      duracion: parseNum(duracion),
      esfuerzo: esfuerzo || undefined,
      notas: notas.trim() || undefined,
      ejercicios: filas
        .filter((f) => f.nombre.trim())
        .map((f) => ({ nombre: f.nombre.trim(), series: parseNum(f.series), reps: parseNum(f.reps), peso: parseNum(f.peso) })),
    };
    if (entreno.id) await db.entrenos.put({ ...e, id: entreno.id });
    else await db.entrenos.add(e);
    onCerrar();
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar este entreno?')) return;
    await db.entrenos.delete(entreno.id!);
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="fecha-e">Fecha</label>
          <input id="fecha-e" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="dur-e">Duración (min)</label>
          <input id="dur-e" inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value)} className="campo" placeholder="60" />
        </div>
      </div>

      <div>
        <span className="etiqueta">Tipo</span>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...TIPOS, tipo])].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`chip !px-3.5 !py-2 !text-sm ${tipo === t ? 'bg-dorado text-fondo' : 'bg-campo text-suave'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="etiqueta">
          Esfuerzo percibido {esfuerzo > 0 && <span className="text-champagne normal-case">· {esfuerzo}/10</span>}
        </span>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEsfuerzo(esfuerzo === n ? 0 : n)}
              className={`h-9 rounded-lg text-xs font-semibold transition ${n <= esfuerzo ? 'bg-dorado text-fondo' : 'bg-campo text-suave'}`}
              aria-label={`Esfuerzo ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="etiqueta !mb-0">Ejercicios</span>
          {filas.length === 0 && ultimoMismoTipo && (
            <button type="button" onClick={() => setFilas(ultimoMismoTipo.ejercicios.map(aFila))} className="text-dorado text-xs font-semibold">
              Copiar último de {tipo}
            </button>
          )}
        </div>
        <datalist id="ejercicios-previos">
          {nombresPrevios.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="flex flex-col gap-2">
          {filas.map((f, i) => (
            <div key={i} className="bg-campo/60 rounded-2xl p-2.5">
              <div className="mb-2 flex gap-2">
                <input
                  value={f.nombre}
                  onChange={(e) => cambiar(i, 'nombre', e.target.value)}
                  list="ejercicios-previos"
                  className="campo !bg-black/25 !py-2.5"
                  placeholder="Ej.: Sentadilla"
                  aria-label="Nombre del ejercicio"
                />
                <button type="button" onClick={() => setFilas((x) => x.filter((_, j) => j !== i))} className="text-suave hover:text-sube shrink-0 px-2" aria-label="Quitar ejercicio">
                  <Icon name="cerrar" size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['series', 'Series'],
                    ['reps', 'Reps'],
                    ['peso', `Peso (${ajustes.unidadPeso})`],
                  ] as const
                ).map(([k, t]) => (
                  <label key={k} className="block">
                    <span className="text-suave mb-1 block text-[10px] font-medium uppercase">{t}</span>
                    <input value={f[k]} onChange={(e) => cambiar(i, k, e.target.value)} inputMode="decimal" className="campo !bg-black/25 !py-2 text-center tabular-nums" placeholder="—" />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setFilas((x) => [...x, filaVacia()])} className="btn-sec w-full border border-dashed border-white/10">
            <Icon name="mas" size={18} /> Agregar ejercicio
          </button>
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="notas-e">Notas</label>
        <textarea id="notas-e" value={notas} onChange={(e) => setNotas(e.target.value)} className="campo min-h-20 resize-none" placeholder="¿Cómo te sentiste? ¿Subiste peso?" />
      </div>

      <div className="flex gap-2">
        {entreno.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar entreno">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button className="btn-oro flex-1">Guardar entreno</button>
      </div>
    </form>
  );
}
