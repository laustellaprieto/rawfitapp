import { useMemo, useState } from 'react';
import { db, type Medida } from '../lib/db';
import { fechaCorta, fechaRelativa, hoyISO } from '../lib/dates';
import { num, parseNum } from '../lib/format';
import { useAjustes, useMedidas } from '../lib/hooks';
import { anterior, CAMPOS, primeroYUltimo, unidadDe, type CampoMedida } from '../lib/medidas';
import { GraficaLinea } from '../components/Graficas';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { BotonAgregar, Delta, Encabezado, Segmentos, Vacio } from '../components/ui';

export default function Medidas() {
  const medidas = useMedidas();
  const ajustes = useAjustes();
  const [campo, setCampo] = useState<CampoMedida>('peso');
  const [editando, setEditando] = useState<Medida | null>(null);
  const lista = useMemo(() => medidas ?? [], [medidas]);

  const datos = lista.filter((m) => m[campo] !== undefined).map((m) => ({ x: fechaCorta(m.fecha), y: m[campo]! }));
  const resumen = primeroYUltimo(lista, campo);
  const u = unidadDe(campo, ajustes);
  const camposConDatos = CAMPOS.filter((c) => lista.some((m) => m[c.campo] !== undefined));

  const nuevo = () => setEditando({ fecha: hoyISO() });

  return (
    <>
      <Encabezado subtitulo="Tu cuerpo en números" titulo="Medidas" accion={<BotonAgregar onClick={nuevo}>Registrar</BotonAgregar>} />

      {medidas !== undefined && lista.length === 0 ? (
        <Vacio
          icono="medidas"
          titulo="Tu primer registro"
          texto="Anota tu peso y medidas de hoy. Repite cada 1–2 semanas, en ayunas y a la misma hora, para ver tu progreso real."
          accion={<BotonAgregar onClick={nuevo}>Registrar medidas</BotonAgregar>}
        />
      ) : (
        <>
          <section className="tarjeta animate-entrada mb-4">
            <Segmentos
              opciones={(camposConDatos.length ? camposConDatos : CAMPOS).map((c) => ({ valor: c.campo, texto: c.nombre }))}
              valor={campo}
              onChange={setCampo}
            />
            {resumen ? (
              <>
                <div className="mt-4 mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-suave text-xs">Actual</p>
                    <p className="titulo text-5xl leading-none">
                      {num(resumen.ultimo[campo])}
                      <span className="text-suave ml-1 font-sans text-base">{u}</span>
                    </p>
                  </div>
                  {resumen.n > 1 && (
                    <div className="text-right">
                      <p className="text-suave mb-1 text-xs">Desde el inicio</p>
                      <Delta valor={resumen.ultimo[campo]! - resumen.primero[campo]!} unidad={u} className="!text-sm" />
                    </div>
                  )}
                </div>
                {datos.length > 1 ? (
                  <GraficaLinea datos={datos} unidad={u} meta={campo === 'peso' ? ajustes.pesoObjetivo : undefined} />
                ) : (
                  <p className="text-suave py-6 text-center text-sm">Con un registro más verás tu gráfica de progreso.</p>
                )}
              </>
            ) : (
              <p className="text-suave py-8 text-center text-sm">Aún no hay datos de esta medida.</p>
            )}
          </section>

          {camposConDatos.length > 0 && (
            <section className="animate-entrada mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {camposConDatos.map((c) => {
                const r = primeroYUltimo(lista, c.campo)!;
                const un = unidadDe(c.campo, ajustes);
                return (
                  <button
                    key={c.campo}
                    onClick={() => setCampo(c.campo)}
                    className={`tarjeta text-left transition ${campo === c.campo ? '!border-dorado/40' : 'hover:!border-white/10'}`}
                  >
                    <p className="text-suave text-[11px] font-medium tracking-wider uppercase">{c.nombre}</p>
                    <p className="titulo mt-1 text-3xl leading-none">
                      {num(r.ultimo[c.campo])}
                      <span className="text-suave ml-1 font-sans text-xs">{un}</span>
                    </p>
                    <div className="mt-2 min-h-5">{r.n > 1 && <Delta valor={r.ultimo[c.campo]! - r.primero[c.campo]!} unidad={un} />}</div>
                  </button>
                );
              })}
            </section>
          )}

          <section className="tarjeta animate-entrada">
            <h2 className="titulo mb-3 text-2xl">Historial</h2>
            <div className="flex flex-col divide-y divide-white/5">
              {[...lista].reverse().map((m) => {
                const i = lista.indexOf(m);
                const valores = CAMPOS.filter((c) => m[c.campo] !== undefined);
                return (
                  <button key={m.id} onClick={() => setEditando(m)} className="-mx-2 rounded-xl px-2 py-3 text-left transition hover:bg-white/[0.03]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-champagne text-sm font-semibold">{fechaRelativa(m.fecha)}</span>
                      <Icon name="editar" size={14} className="text-suave" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {valores.map((c) => {
                        const prev = anterior(lista, i, c.campo);
                        return (
                          <div key={c.campo} className="flex items-center gap-1.5 text-sm">
                            <span className="text-suave text-xs">{c.nombre}</span>
                            <span className="font-semibold tabular-nums">{num(m[c.campo])}</span>
                            {prev !== undefined && <Delta valor={m[c.campo]! - prev} />}
                          </div>
                        );
                      })}
                    </div>
                    {m.notas && <p className="text-suave mt-2 text-xs italic">“{m.notas}”</p>}
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <FormMedida medida={editando} onCerrar={() => setEditando(null)} />
    </>
  );
}

function FormMedida({ medida, onCerrar }: { medida: Medida | null; onCerrar: () => void }) {
  const ajustes = useAjustes();
  return (
    <Sheet abierto={!!medida} onCerrar={onCerrar} titulo={medida?.id ? 'Editar registro' : 'Nuevo registro'}>
      {medida && <Formulario key={medida.id ?? 'nuevo'} medida={medida} onCerrar={onCerrar} unidades={ajustes} />}
    </Sheet>
  );
}

function Formulario({ medida, onCerrar, unidades }: { medida: Medida; onCerrar: () => void; unidades: ReturnType<typeof useAjustes> }) {
  const [fecha, setFecha] = useState(medida.fecha);
  const [valores, setValores] = useState<Record<CampoMedida, string>>(
    () => Object.fromEntries(CAMPOS.map((c) => [c.campo, medida[c.campo]?.toString() ?? ''])) as Record<CampoMedida, string>,
  );
  const [notas, setNotas] = useState(medida.notas ?? '');

  const algunValor = CAMPOS.some((c) => parseNum(valores[c.campo]) !== undefined);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const m: Medida = { fecha, notas: notas.trim() || undefined };
    for (const c of CAMPOS) m[c.campo] = parseNum(valores[c.campo]);
    if (medida.id) await db.medidas.put({ ...m, id: medida.id });
    else await db.medidas.add(m);
    onCerrar();
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar este registro de medidas?')) return;
    await db.medidas.delete(medida.id!);
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        <label className="etiqueta" htmlFor="fecha-medida">Fecha</label>
        <input id="fecha-medida" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map((c) => (
          <div key={c.campo}>
            <label className="etiqueta" htmlFor={`m-${c.campo}`}>
              {c.nombre} <span className="normal-case opacity-70">({unidadDe(c.campo, unidades)})</span>
            </label>
            <input
              id={`m-${c.campo}`}
              inputMode="decimal"
              value={valores[c.campo]}
              onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))}
              className="campo tabular-nums"
              placeholder="—"
            />
          </div>
        ))}
      </div>
      <div>
        <label className="etiqueta" htmlFor="notas-medida">Notas</label>
        <input id="notas-medida" value={notas} onChange={(e) => setNotas(e.target.value)} className="campo" placeholder="Ej.: en ayunas, después de vacaciones…" />
      </div>
      <p className="text-suave -mt-1 text-xs">Llena solo lo que quieras medir. Mide siempre en el mismo punto del cuerpo.</p>
      <div className="flex gap-2">
        {medida.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar registro">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button className="btn-oro flex-1" disabled={!algunValor || !fecha}>
          Guardar
        </button>
      </div>
    </form>
  );
}
