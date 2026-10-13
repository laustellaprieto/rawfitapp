import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, type Medicion, type Perfil } from '../../lib/db';
import { fechaCorta, fechaRelativa, hoyISO } from '../../lib/fechas';
import { num, parseNum } from '../../lib/format';
import { analizar, CAMPOS_MEDICION, cinturaEstatura, resumenCampo, type CampoMedicion } from '../../lib/progreso';
import { GraficaDosLineas, GraficaLinea } from '../../components/Graficas';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { BotonAgregar, Delta, Vacio } from '../../components/ui';

export default function Medidas({ perfil, abrirForm }: { perfil: Perfil; abrirForm?: boolean }) {
  const mediciones = useLiveQuery(() => db.mediciones.orderBy('fecha').toArray(), []);
  const lista = mediciones ?? [];
  const [editando, setEditando] = useState<Medicion | null>(null);
  const nueva = () => setEditando({ fecha: hoyISO() });

  useEffect(() => {
    if (abrirForm) nueva();
  }, [abrirForm]);

  const analisis = analizar(lista);
  const cintura = resumenCampo(lista, 'cintura');
  const ice = cintura && perfil.estatura ? cinturaEstatura(cintura.actual, perfil.estatura) : undefined;
  const datosPeso = lista.filter((m) => m.peso !== undefined).map((m) => ({ x: fechaCorta(m.fecha), y: m.peso! }));
  const datosPerimetros = lista.filter((m) => m.cintura !== undefined || m.abdomen !== undefined).map((m) => ({ x: fechaCorta(m.fecha), cintura: m.cintura, abdomen: m.abdomen }));

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-suave text-sm">Mide cada 7 o 15 días.</p>
        <BotonAgregar onClick={nueva}>Nueva medición</BotonAgregar>
      </div>

      <Instrucciones />

      {mediciones !== undefined && lista.length === 0 ? (
        <Vacio
          icono="medidas"
          titulo="Tu primera medición"
          texto="Registra tu peso, cintura y abdomen de hoy. Será tu punto de partida."
          accion={<BotonAgregar onClick={nueva}>Registrar medidas</BotonAgregar>}
        />
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="animate-entrada mb-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
            {CAMPOS_MEDICION.map((c) => (
              <Resumen key={c.campo} lista={lista} campo={c.campo} nombre={c.nombre} unidad={c.unidad} />
            ))}
          </div>

          {/* Análisis automático */}
          <section className={`tarjeta animate-entrada mb-4 ${analisis.tipo === 'grasa' || analisis.tipo === 'recomposicion' ? '!border-baja/25' : analisis.tipo === 'faltan' ? '' : '!border-dorado/25'}`}>
            <p className="text-dorado mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              <Icon name="info" size={14} /> Análisis de tu progreso
            </p>
            <p className={`text-lg leading-snug font-semibold ${analisis.tipo === 'grasa' || analisis.tipo === 'recomposicion' ? 'text-baja' : 'text-champagne'}`}>{analisis.titulo}</p>
            <p className="text-suave mt-1 text-sm">{analisis.texto}</p>
          </section>

          {datosPeso.length > 1 && (
            <section className="tarjeta animate-entrada mb-4">
              <h2 className="titulo mb-2 text-2xl">Peso (kg)</h2>
              <GraficaLinea datos={datosPeso} unidad="kg" />
            </section>
          )}

          {datosPerimetros.length > 1 && (
            <section className="tarjeta animate-entrada mb-4">
              <h2 className="titulo mb-2 text-2xl">Cintura y abdomen (cm)</h2>
              <GraficaDosLineas
                datos={datosPerimetros}
                unidad="cm"
                series={[
                  { clave: 'cintura', nombre: 'Cintura', color: '#C9A96E' },
                  { clave: 'abdomen', nombre: 'Abdomen', color: '#F2F2F2', punteada: true },
                ]}
              />
            </section>
          )}

          {/* Cintura / estatura */}
          <section className="tarjeta animate-entrada mb-4">
            <h2 className="titulo text-2xl">Relación cintura / estatura</h2>
            {!perfil.estatura ? (
              <p className="text-suave mt-1 text-sm">Agrega tu estatura en Ajustes para calcularla.</p>
            ) : !ice ? (
              <p className="text-suave mt-1 text-sm">Registra tu cintura para calcularla.</p>
            ) : (
              <>
                <div className="mt-2 flex items-end gap-3">
                  <p className="titulo text-5xl leading-none">{num(ice.valor, 2)}</p>
                  <p className={`mb-1 text-sm font-semibold ${ice.nivel === 'bajo' ? 'text-baja' : ice.nivel === 'medio' ? 'text-dorado' : 'text-sube'}`}>{ice.texto}</p>
                </div>
                <EscalaICE valor={ice.valor} />
                <p className="text-suave mt-2 text-xs">
                  Cintura {num(cintura!.actual)} cm ÷ estatura {num(perfil.estatura)} cm.
                </p>
              </>
            )}
            <ul className="text-suave mt-3 flex flex-col gap-1 text-xs">
              <li><b className="text-baja">Menos de 0,50:</b> rango asociado a menor riesgo.</li>
              <li><b className="text-dorado">0,50 a 0,59:</b> riesgo aumentado.</li>
              <li><b className="text-sube">0,60 o más:</b> riesgo alto; sugerimos valoración con un profesional de la salud.</li>
            </ul>
            <p className="text-suave/70 mt-2 text-[10px]">Fuente: Ashwell M. et al. (2012), Obesity Reviews.</p>
          </section>

          {/* Historial */}
          <section className="tarjeta animate-entrada">
            <h2 className="titulo mb-2 text-2xl">Historial</h2>
            <div className="flex flex-col divide-y divide-white/5">
              {[...lista].reverse().map((m) => {
                const i = lista.indexOf(m);
                return (
                  <button key={m.id} onClick={() => setEditando(m)} className="-mx-2 rounded-xl px-2 py-3 text-left transition hover:bg-white/[0.03]">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-champagne text-sm font-semibold">{fechaRelativa(m.fecha)}</span>
                      <Icon name="editar" size={14} className="text-suave" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {CAMPOS_MEDICION.filter((c) => m[c.campo] !== undefined).map((c) => {
                        const prev = lista.slice(0, i).reverse().find((x) => x[c.campo] !== undefined)?.[c.campo];
                        return (
                          <span key={c.campo} className="flex items-center gap-1.5 text-sm">
                            <span className="text-suave text-xs">{c.nombre}</span>
                            <span className="font-semibold tabular-nums">{num(m[c.campo])}</span>
                            {prev !== undefined && <Delta valor={m[c.campo]! - prev} />}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <Sheet abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar medición' : 'Nueva medición'}>
        {editando && <FormMedicion key={editando.id ?? 'nueva'} medicion={editando} onCerrar={() => setEditando(null)} />}
      </Sheet>
    </>
  );
}

function Resumen({ lista, campo, nombre, unidad }: { lista: Medicion[]; campo: CampoMedicion; nombre: string; unidad: string }) {
  const r = resumenCampo(lista, campo);
  return (
    <div className="tarjeta">
      <p className="text-suave text-[11px] font-medium tracking-wider uppercase">{nombre}</p>
      <p className="titulo mt-1 text-4xl leading-none">
        {r ? num(r.actual) : '—'}
        <span className="text-suave ml-1 font-sans text-xs">{unidad}</span>
      </p>
      {r && (
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
          <dt className="text-suave">Inicial</dt>
          <dd className="text-right tabular-nums">
            {num(r.inicial)} {unidad}
          </dd>
          <dt className="text-suave">Total</dt>
          <dd className="text-right">{r.total !== undefined ? <Delta valor={r.total} unidad={unidad} /> : '—'}</dd>
          <dt className="text-suave">Vs anterior</dt>
          <dd className="text-right">{r.vsAnterior !== undefined ? <Delta valor={r.vsAnterior} unidad={unidad} /> : '—'}</dd>
        </dl>
      )}
    </div>
  );
}

function EscalaICE({ valor }: { valor: number }) {
  const MIN = 0.35;
  const MAX = 0.75;
  const pos = Math.min(100, Math.max(0, ((valor - MIN) / (MAX - MIN)) * 100));
  const p50 = ((0.5 - MIN) / (MAX - MIN)) * 100;
  const p60 = ((0.6 - MIN) / (MAX - MIN)) * 100;
  return (
    <div className="mt-4">
      <div className="relative flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <div className="bg-baja/70" style={{ width: `${p50}%` }} />
        <div className="bg-dorado/80" style={{ width: `${p60 - p50}%` }} />
        <div className="bg-sube/70 flex-1" />
      </div>
      <div className="relative h-4">
        <div className="bg-texto absolute -top-4 size-4 -translate-x-1/2 rounded-full border-[3px] border-[#1C1C1C] transition-all duration-700" style={{ left: `${pos}%` }} />
        <span className="text-suave absolute top-1 -translate-x-1/2 text-[10px]" style={{ left: `${p50}%` }}>0,50</span>
        <span className="text-suave absolute top-1 -translate-x-1/2 text-[10px]" style={{ left: `${p60}%` }}>0,60</span>
      </div>
    </div>
  );
}

function Instrucciones() {
  return (
    <details className="tarjeta animate-entrada group mb-4 !py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Icon name="info" size={18} className="text-dorado" /> Cómo medirte
        </span>
        <Icon name="abajo" size={18} className="text-suave transition group-open:rotate-180" />
      </summary>
      <ul className="text-suave mt-3 flex list-disc flex-col gap-2 pl-5 text-sm marker:text-[#C9A96E]">
        <li>Mismo día de la semana, en ayunas y después de ir al baño.</li>
        <li>
          <b className="text-texto">Cintura:</b> en el punto medio entre la última costilla y el borde superior de la cadera.
        </li>
        <li>
          <b className="text-texto">Abdomen:</b> a la altura del ombligo.
        </li>
        <li>Cinta horizontal, sin apretar, al final de una exhalación normal.</li>
      </ul>
    </details>
  );
}

function FormMedicion({ medicion, onCerrar }: { medicion: Medicion; onCerrar: () => void }) {
  const [fecha, setFecha] = useState(medicion.fecha);
  const [valores, setValores] = useState<Record<CampoMedicion, string>>({
    peso: medicion.peso?.toString() ?? '',
    cintura: medicion.cintura?.toString() ?? '',
    abdomen: medicion.abdomen?.toString() ?? '',
  });
  const algun = CAMPOS_MEDICION.some((c) => parseNum(valores[c.campo]) !== undefined);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const m: Medicion = { fecha, peso: parseNum(valores.peso), cintura: parseNum(valores.cintura), abdomen: parseNum(valores.abdomen) };
    if (medicion.id) await db.mediciones.put({ ...m, id: medicion.id });
    else await db.mediciones.add(m);
    onCerrar();
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta medición?')) return;
    await db.mediciones.delete(medicion.id!);
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        <label className="etiqueta" htmlFor="m-fecha">Fecha</label>
        <input id="m-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {CAMPOS_MEDICION.map((c) => (
          <div key={c.campo}>
            <label className="etiqueta" htmlFor={`m-${c.campo}`}>
              {c.nombre} <span className="normal-case opacity-70">({c.unidad})</span>
            </label>
            <input
              id={`m-${c.campo}`}
              inputMode="decimal"
              value={valores[c.campo]}
              onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))}
              className="campo text-center tabular-nums"
              placeholder="—"
            />
          </div>
        ))}
      </div>
      <p className="text-suave -mt-1 text-xs">En ayunas, después de ir al baño, con la cinta horizontal y sin apretar.</p>
      <div className="flex gap-2">
        {medicion.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar medición">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button className="btn-oro flex-1" disabled={!algun || !fecha}>
          Guardar
        </button>
      </div>
    </form>
  );
}
