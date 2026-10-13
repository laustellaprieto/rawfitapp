import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMOJIS_HABITO } from '../../data/habitos';
import { calcularCalorias, kcal, macrosDelPerfil, textoMeta } from '../../lib/calorias';
import { borrarPdf, cargarCliente, guardarParaCliente, limpiar, subirPdf, urlFirmada, type DatosCliente } from '../../lib/coach';
import type { Habito, Rutina } from '../../lib/db';
import { diaDelReto, fechaCorta, fechaRelativa, hoyISO, sumarDias, toISO } from '../../lib/fechas';
import { num } from '../../lib/format';
import { indexarRegistros, porcentajeDia, rachaActual } from '../../lib/habitos';
import { formatoVolumen, volumenSesion } from '../../lib/entreno';
import { analizar, resumenCampo } from '../../lib/progreso';
import { textoObjetivo } from '../../lib/rutinas';
import { traducirError, type PerfilNube } from '../../lib/nube';
import { GraficaLinea } from '../../components/Graficas';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Delta, Segmentos, Stat } from '../../components/ui';
import { EditorRutina } from './EditorRutina';
import { Avatar, nombreDe } from './PanelCoach';

type Pestana = 'progreso' | 'entreno' | 'nutricion' | 'habitos';

export default function ClienteDetalle({ cliente, onVolver }: { cliente: PerfilNube; onVolver: () => void }) {
  const [d, setD] = useState<DatosCliente>();
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState<Pestana>('progreso');

  const cargar = useCallback(async () => {
    try {
      setD(await cargarCliente(cliente.id));
      setError('');
    } catch (e) {
      setError(traducirError(e));
    }
  }, [cliente.id]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (tabla: 'rutinas' | 'habitos' | 'nutricion', uid: string, data: object | null) => {
    try {
      await guardarParaCliente(cliente.id, tabla, uid, data);
      await cargar();
    } catch (e) {
      alert(traducirError(e));
    }
  };

  return (
    <>
      <button onClick={onVolver} className="text-suave hover:text-texto mb-3 inline-flex items-center gap-1 text-sm">
        <Icon name="izq" size={16} /> Mis clientes
      </button>
      <header className="animate-entrada mb-4 flex items-center gap-3">
        <Avatar p={cliente} tam="size-14" />
        <div className="min-w-0">
          <h1 className="titulo truncate text-4xl leading-none">{d?.perfil?.nombre || nombreDe(cliente)}</h1>
          <p className="text-suave truncate text-xs">{cliente.email}</p>
          {d?.perfil?.fechaInicio && <p className="text-champagne text-xs font-semibold">Día {diaDelReto(d.perfil.fechaInicio)} del reto</p>}
        </div>
      </header>

      <div className="mb-4">
        <Segmentos
          opciones={[
            { valor: 'progreso' as const, texto: 'Progreso' },
            { valor: 'entreno' as const, texto: 'Entreno' },
            { valor: 'nutricion' as const, texto: 'Nutrición' },
            { valor: 'habitos' as const, texto: 'Hábitos' },
          ]}
          valor={pestana}
          onChange={setPestana}
        />
      </div>

      {error && <p className="bg-sube/10 text-sube mb-4 rounded-xl px-3 py-2 text-sm">{error}</p>}
      {!d && !error && <p className="text-suave py-10 text-center text-sm">Cargando…</p>}
      {d && pestana === 'progreso' && <Progreso d={d} cliente={cliente} />}
      {d && pestana === 'entreno' && <Entreno d={d} guardar={guardar} />}
      {d && pestana === 'nutricion' && <Nutricion d={d} cliente={cliente} recargar={cargar} />}
      {d && pestana === 'habitos' && <Habitos d={d} guardar={guardar} />}
    </>
  );
}

/* ───────────── Progreso ───────────── */

function Progreso({ d, cliente }: { d: DatosCliente; cliente: PerfilNube }) {
  const hoy = hoyISO();
  const activos = d.habitos.filter((h) => h.activo);
  const idx = useMemo(() => indexarRegistros(d.registros), [d.registros]);
  const promedio = (dias: number) => Array.from({ length: dias }, (_, i) => porcentajeDia(sumarDias(hoy, -i), activos, idx)).reduce((a, b) => a + b, 0) / dias;
  const racha = rachaActual(activos, idx);
  const cal = d.perfil ? calcularCalorias(d.perfil) : undefined;
  const mac = d.perfil ? macrosDelPerfil(d.perfil) : undefined;
  const peso = resumenCampo(d.mediciones, 'peso');
  const cintura = resumenCampo(d.mediciones, 'cintura');
  const analisis = analizar(d.mediciones);
  const ultima = [d.sesiones[0]?.fecha, d.mediciones.at(-1)?.fecha, [...idx.keys()].sort().at(-1)].filter(Boolean).sort().at(-1);
  const semana = d.sesiones.filter((s) => s.fecha >= sumarDias(hoy, -6)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat etiqueta="Hábitos 7 días" valor={`${Math.round(promedio(7) * 100)}%`} extra={<span className="text-suave">30 días: {Math.round(promedio(30) * 100)}%</span>} />
        <Stat etiqueta="Racha" icono="fuego" valor={racha.dias} extra={<span className="text-suave">días ≥ 80 %</span>} />
        <Stat etiqueta="Entrenos" valor={semana} extra={<span className="text-suave">últimos 7 días</span>} />
        <Stat etiqueta="Última actividad" valor={<span className="text-2xl">{ultima ? fechaRelativa(ultima) : '—'}</span>} />
      </div>

      {d.perfil && (
        <section className="tarjeta">
          <h2 className="titulo mb-2 text-2xl">Datos</h2>
          <p className="text-suave text-sm">
            {[d.perfil.sexo && (d.perfil.sexo === 'mujer' ? 'Mujer' : 'Hombre'), d.perfil.edad && `${d.perfil.edad} años`, d.perfil.estatura && `${num(d.perfil.estatura)} cm`].filter(Boolean).join(' · ') || 'Sin datos corporales'}
          </p>
          {d.perfil.objetivo && <p className="text-champagne mt-2 text-sm">“{d.perfil.objetivo}”</p>}
          {cal && (
            <p className="mt-2 text-sm">
              <b>{kcal(cal.objetivo)}</b> <span className="text-suave">· {textoMeta(cal)}</span>
              {mac && <span className="text-suave block text-xs">Proteína {mac.proteina.gramos} g · Carbohidratos {mac.carbos.gramos} g · Grasa {mac.grasa.gramos} g</span>}
            </p>
          )}
        </section>
      )}

      <section className="tarjeta">
        <h2 className="titulo text-2xl">Medidas</h2>
        <p className={`mt-1 text-sm font-semibold ${analisis.tipo === 'grasa' || analisis.tipo === 'recomposicion' ? 'text-baja' : 'text-champagne'}`}>{analisis.titulo}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {[
            ['Peso', peso, 'kg'],
            ['Cintura', cintura, 'cm'],
          ].map(([n, r, u]) => {
            const x = r as ReturnType<typeof resumenCampo>;
            return (
              <div key={n as string}>
                <p className="text-suave text-xs">{n as string}</p>
                <p className="titulo text-3xl leading-none">
                  {x ? num(x.actual) : '—'} <span className="text-suave font-sans text-xs">{u as string}</span>
                </p>
                {x?.total !== undefined && <Delta valor={x.total} unidad={u as string} />}
              </div>
            );
          })}
        </div>
        {d.mediciones.filter((m) => m.peso !== undefined).length > 1 && (
          <div className="mt-3">
            <GraficaLinea alto={160} datos={d.mediciones.filter((m) => m.peso !== undefined).map((m) => ({ x: fechaCorta(m.fecha), y: m.peso! }))} unidad="kg" />
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="titulo mb-2 text-2xl">Últimas sesiones</h2>
        {d.sesiones.length === 0 ? (
          <p className="text-suave text-sm">Aún no registra entrenos.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {d.sesiones.slice(0, 8).map((s, i) => (
              <li key={i} className="py-2.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-semibold">{s.nombre}</span>
                  <span className="text-suave text-xs">{fechaRelativa(s.fecha)}</span>
                </div>
                <p className="text-suave text-xs">
                  {s.ejercicios.length} ejercicios · <b className="text-champagne">{formatoVolumen(volumenSesion(s))}</b>
                </p>
                <p className="text-texto/70 truncate text-xs">
                  {s.ejercicios.map((e) => `${e.nombre} ${e.series.map((x) => `${x.reps ?? '?'}×${x.peso ?? 0}`).join(', ')}`).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fotos d={d} cliente={cliente} />
    </div>
  );
}

function Fotos({ d, cliente }: { d: DatosCliente; cliente: PerfilNube }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let vivo = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const f of d.fotos.slice(0, 24)) out[f.uid] = await urlFirmada('fotos', f.path).catch(() => '');
      if (vivo) setUrls(out);
    })();
    return () => {
      vivo = false;
    };
  }, [d.fotos]);

  return (
    <section className="tarjeta">
      <h2 className="titulo mb-2 text-2xl">Check-ins</h2>
      {!cliente.compartir_fotos && <p className="text-suave mb-2 text-xs">Tu cliente no comparte sus fotos (solo ves fecha, peso y nota).</p>}
      {d.checkins.length === 0 ? (
        <p className="text-suave text-sm">Sin check-ins todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {d.checkins.slice(0, 8).map((c) => {
            const fotos = d.fotos.filter((f) => f.checkinUid === c.uid);
            return (
              <div key={c.uid}>
                <p className="text-sm">
                  <b className="text-champagne">{fechaRelativa(c.fecha)}</b>
                  {c.peso !== undefined && <span className="text-suave"> · {num(c.peso)} kg</span>}
                </p>
                {c.nota && <p className="text-suave text-xs italic">“{c.nota}”</p>}
                {fotos.length > 0 && (
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {fotos.map((f) => (
                      <a key={f.uid} href={urls[f.uid]} target="_blank" rel="noreferrer" className="bg-campo aspect-[3/4] overflow-hidden rounded-xl">
                        {urls[f.uid] && <img src={urls[f.uid]} alt={f.pose} className="size-full object-cover" />}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ───────────── Entreno ───────────── */

function Entreno({ d, guardar }: { d: DatosCliente; guardar: (t: 'rutinas', uid: string, data: object | null) => Promise<void> }) {
  const [editando, setEditando] = useState<Rutina | null>(null);
  const nueva = () => setEditando({ uid: crypto.randomUUID(), nombre: '', orden: d.rutinas.length, ejercicios: [] });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-suave text-sm">Las rutinas aparecen en la app de tu cliente en Entreno (y en Hoy si les pones día).</p>
        <button className="btn-oro shrink-0 !py-2.5" onClick={nueva}>
          <Icon name="mas" size={18} strokeWidth={2.4} /> Rutina
        </button>
      </div>
      {d.rutinas.length === 0 && <p className="tarjeta text-suave text-center text-sm">Aún no hay rutinas para este cliente.</p>}
      {d.rutinas.map((r) => (
        <button key={r.uid} onClick={() => setEditando(r)} className="tarjeta text-left transition hover:!border-white/10">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{r.nombre}</p>
            <span className="text-suave text-xs">{r.dia ?? 'Cualquier día'}</span>
          </div>
          <ul className="mt-2 flex flex-col gap-0.5 text-xs">
            {r.ejercicios.map((e, i) => (
              <li key={i}>
                {e.nombre} <span className="text-champagne">{textoObjetivo(e)}</span>
              </li>
            ))}
          </ul>
        </button>
      ))}
      <Sheet abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.nombre ? 'Editar rutina' : 'Nueva rutina'}>
        {editando && (
          <EditorRutina
            key={editando.uid}
            rutina={editando}
            onGuardar={async (r) => {
              await guardar('rutinas', editando.uid!, limpiar(r));
              setEditando(null);
            }}
            onBorrar={
              d.rutinas.some((r) => r.uid === editando.uid)
                ? async () => {
                    await guardar('rutinas', editando.uid!, null);
                    setEditando(null);
                  }
                : undefined
            }
          />
        )}
      </Sheet>
    </div>
  );
}

/* ───────────── Nutrición ───────────── */

function Nutricion({ d, cliente, recargar }: { d: DatosCliente; cliente: PerfilNube; recargar: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return alert('Elige un archivo PDF.');
    if (f.size > 20 * 1024 * 1024) return alert('El PDF pesa más de 20 MB. Comprímelo e inténtalo de nuevo.');
    const nombre = prompt('Nombre del plan (lo verá tu cliente):', f.name.replace(/\.pdf$/i, ''));
    if (nombre === null) return;
    setSubiendo(true);
    try {
      await subirPdf(cliente.id, f, nombre.trim() || 'Plan de nutrición');
      await recargar();
    } catch (e) {
      alert(traducirError(e));
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-suave text-sm">El PDF más reciente aparece como “Plan actual” en la pantalla Hoy de tu cliente, y lo puede abrir sin internet.</p>
      <button className="btn-oro w-full" disabled={subiendo} onClick={() => input.current?.click()}>
        <Icon name="subir" size={18} /> {subiendo ? 'Subiendo…' : 'Subir PDF de nutrición'}
      </button>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
      {d.nutricion.length === 0 && <p className="tarjeta text-suave text-center text-sm">Aún no hay planes de nutrición.</p>}
      {d.nutricion.map((n, i) => (
        <div key={n.uid} className="tarjeta flex items-center gap-3 !p-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i === 0 ? 'bg-dorado/15 text-dorado' : 'bg-campo text-suave'}`}>
            <Icon name="documento" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{n.nombre}</p>
            <p className="text-suave text-xs">
              {i === 0 && 'Plan actual · '}
              {fechaRelativa(toISO(new Date(n.subidoEn)))}
            </p>
          </div>
          <button onClick={async () => window.open(await urlFirmada('nutricion', n.path), '_blank')} className="text-dorado text-xs font-semibold">
            Ver
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Borrar "${n.nombre}"?`)) return;
              try {
                await borrarPdf(cliente.id, n);
                await recargar();
              } catch (e) {
                alert(traducirError(e));
              }
            }}
            className="text-suave hover:text-sube p-1"
            aria-label={`Borrar ${n.nombre}`}
          >
            <Icon name="basura" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Hábitos ───────────── */

function Habitos({ d, guardar }: { d: DatosCliente; guardar: (t: 'habitos', uid: string, data: object | null) => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const idx = useMemo(() => indexarRegistros(d.registros), [d.registros]);
  const hoy = hoyISO();
  const cumplimiento = (h: Habito) => Array.from({ length: 30 }, (_, i) => (idx.get(sumarDias(hoy, -i))?.has(h.id!) ? 1 : 0) as number).reduce((a, b) => a + b, 0) / 30;
  const maxOrden = d.habitos.reduce((m, h) => Math.max(m, h.orden), 0);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await guardar('habitos', crypto.randomUUID(), { nombre: nombre.trim(), emoji, orden: maxOrden + 1, activo: true, origen: 'coach' });
    setNombre('');
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={agregar} className="tarjeta">
        <label className="etiqueta" htmlFor="hc-nombre">Asignar un hábito</label>
        <div className="flex gap-2">
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="campo !w-14 shrink-0 appearance-none !px-0 text-center text-lg" aria-label="Emoji">
            {EMOJIS_HABITO.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input id="hc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Ej.: Creatina 5 g" maxLength={50} />
          <button className="btn-oro shrink-0 !px-3.5" disabled={!nombre.trim()} aria-label="Asignar hábito">
            <Icon name="mas" size={20} strokeWidth={2.4} />
          </button>
        </div>
        <p className="text-suave mt-2 text-xs">Tu cliente lo verá en su lista diaria y no podrá editarlo ni borrarlo.</p>
      </form>

      <section className="tarjeta">
        <h2 className="titulo mb-1 text-2xl">Sus hábitos</h2>
        <p className="text-suave mb-3 text-xs">Cumplimiento de los últimos 30 días.</p>
        <ul className="flex flex-col gap-3">
          {d.habitos.map((h) => (
            <li key={h.uid} className={h.activo ? '' : 'opacity-50'}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {h.emoji} {h.nombre}
                  {h.origen === 'coach' && <span className="text-dorado ml-1.5 text-[10px] font-bold uppercase">Tuyo</span>}
                  {!h.activo && <span className="text-suave ml-1.5 text-[10px]">(en pausa)</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-champagne font-semibold tabular-nums">{Math.round(cumplimiento(h) * 100)}%</span>
                  {h.origen === 'coach' && (
                    <button onClick={() => confirm(`¿Quitar "${h.nombre}" a tu cliente?`) && guardar('habitos', h.uid, null)} className="text-suave hover:text-sube" aria-label={`Quitar ${h.nombre}`}>
                      <Icon name="basura" size={15} />
                    </button>
                  )}
                </span>
              </div>
              <div className="bg-campo h-1.5 overflow-hidden rounded-full">
                <div className="bg-dorado h-full rounded-full" style={{ width: `${cumplimiento(h) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
