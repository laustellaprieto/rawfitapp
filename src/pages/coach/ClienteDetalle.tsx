import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMOJIS_HABITO } from '../../data/habitos';
import { calcularCalorias, kcal, macrosDelPerfil, textoMeta } from '../../lib/calorias';
import { aBase, borrarPdf, cargarCliente, guardarParaCliente, guardarPlantilla, limpiar, subirPdf, urlFirmada, type DatosCliente, type Plantilla } from '../../lib/coach';
import type { Habito, Rutina } from '../../lib/db';
import { diaDelReto, fechaCorta, fechaRelativa, hoyISO, sumarDias, toISO } from '../../lib/fechas';
import { num } from '../../lib/format';
import { indexarRegistros, porcentajeDia, rachaActual } from '../../lib/habitos';
import { formatoVolumen, volumenSesion } from '../../lib/entreno';
import { analizar, resumenCampo } from '../../lib/progreso';
import { agruparBloques, finDe, semanasDe, textoFechas, textoObjetivo, type Bloque } from '../../lib/rutinas';
import { traducirError, type PerfilNube } from '../../lib/nube';
import { GraficaLinea } from '../../components/Graficas';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Delta, Segmentos, Stat } from '../../components/ui';
import { CamposBloque, FormAsignar, proximoLunes, type ValoresBloque } from './Asignar';
import { EditorRutina } from './EditorRutina';
import { ElegirPlantilla } from './Plantillas';
import { Avatar, nombreDe } from './comun';

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
            { valor: 'nutricion' as const, texto: 'Alimentación' },
            { valor: 'habitos' as const, texto: 'Hábitos' },
          ]}
          valor={pestana}
          onChange={setPestana}
        />
      </div>

      {error && <p className="bg-sube/10 text-sube mb-4 rounded-xl px-3 py-2 text-sm">{error}</p>}
      {!d && !error && <p className="text-suave py-10 text-center text-sm">Cargando…</p>}
      {d && pestana === 'progreso' && <Progreso d={d} cliente={cliente} />}
      {d && pestana === 'entreno' && <Entreno d={d} cliente={cliente} guardar={guardar} recargar={cargar} />}
      {d && pestana === 'nutricion' && <GuiaAlimentacion d={d} cliente={cliente} recargar={cargar} />}
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

const ESTADO_BLOQUE = {
  vigente: { texto: 'En curso', clase: 'bg-baja/15 text-baja' },
  proximo: { texto: 'Próximo', clase: 'bg-dorado/15 text-dorado' },
  terminado: { texto: 'Terminado', clase: 'bg-campo text-suave' },
} as const;

/** "Semana 1" → "Semana 2"; si no termina en número, agrega " (2)". */
const siguienteNombre = (n?: string) => {
  if (!n) return '';
  const m = n.match(/^(.*?)(\d+)\s*$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${n} (2)`;
};

type Accion =
  | { tipo: 'menu-rutina'; r: Rutina }
  | { tipo: 'menu-bloque'; b: Bloque }
  | { tipo: 'copiar'; rutinas: Rutina[]; b?: Bloque }
  | { tipo: 'duplicar'; b: Bloque }
  | { tipo: 'plantilla'; rutinas: Rutina[]; nombre: string }
  | { tipo: 'editar-bloque'; b: Bloque }
  | { tipo: 'desde-plantilla'; p?: Plantilla };

function Entreno({ d, cliente, guardar, recargar }: { d: DatosCliente; cliente: PerfilNube; guardar: (t: 'rutinas', uid: string, data: object | null) => Promise<void>; recargar: () => Promise<void> }) {
  const [editando, setEditando] = useState<Rutina | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [aviso, setAviso] = useState('');
  const bloques = useMemo(() => agruparBloques(d.rutinas), [d.rutinas]);
  const sugerencias = bloques.filter((b) => b.nombre || b.inicio).map((b) => ({ nombre: b.nombre, inicio: b.inicio, fin: b.fin }));
  const conBloques = bloques.some((b) => b.nombre || b.inicio || b.fin);
  const nueva = (b?: Bloque) => setEditando({ uid: crypto.randomUUID(), nombre: '', orden: Date.now(), ejercicios: [], bloque: b?.nombre, inicio: b?.inicio, fin: b?.fin });
  const listo = (texto: string) => {
    setAccion(null);
    setAviso(texto);
    recargar();
  };
  const cerrar = () => setAccion(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-suave text-sm">Las rutinas aparecen en la app de tu cliente en Entreno (y en Hoy si les pones día). Con un bloque y fechas, solo las ve mientras el bloque está en curso.</p>
      <div className="flex gap-2">
        <button className="btn-sec flex-1 !py-2.5 text-sm" onClick={() => setAccion({ tipo: 'desde-plantilla' })}>
          <Icon name="copiar" size={17} /> Desde plantilla
        </button>
        <button className="btn-oro flex-1 !py-2.5 text-sm" onClick={() => nueva()}>
          <Icon name="mas" size={18} strokeWidth={2.4} /> Rutina
        </button>
      </div>
      {aviso && (
        <p role="status" className="animate-entrada bg-baja/10 text-baja rounded-xl px-3 py-2 text-sm">
          {aviso}
        </p>
      )}
      {d.rutinas.length === 0 && <p className="tarjeta text-suave text-center text-sm">Aún no hay rutinas para este cliente.</p>}

      {bloques.map((b) => (
        <section key={b.clave} className="flex flex-col gap-2">
          {conBloques && (
            <div className={`mt-2 flex items-center gap-2 ${b.estado === 'terminado' ? 'opacity-60' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="titulo text-champagne truncate text-xl leading-none">{b.nombre || (b.inicio || b.fin ? 'Bloque' : 'Sin bloque')}</span>
                  {(b.inicio || b.fin) && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_BLOQUE[b.estado].clase}`}>{ESTADO_BLOQUE[b.estado].texto}</span>}
                </p>
                <p className="text-suave text-xs">{textoFechas(b) || 'Siempre visible'}</p>
              </div>
              <button onClick={() => setAccion({ tipo: 'menu-bloque', b })} className="text-suave hover:text-texto bg-campo grid size-9 shrink-0 place-items-center rounded-full" aria-label={`Opciones del bloque ${b.nombre ?? ''}`}>
                <Icon name="puntos" size={20} strokeWidth={3} />
              </button>
            </div>
          )}
          {b.rutinas.map((r) => (
            <div key={r.uid} className={`tarjeta flex items-start gap-2 !p-3 ${b.estado === 'terminado' ? 'opacity-60' : ''}`}>
              <button onClick={() => setEditando(r)} className="min-w-0 flex-1 text-left">
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
              <button onClick={() => setAccion({ tipo: 'menu-rutina', r })} className="text-suave hover:text-texto -mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full" aria-label={`Opciones de ${r.nombre}`}>
                <Icon name="puntos" size={20} strokeWidth={3} />
              </button>
            </div>
          ))}
        </section>
      ))}

      <Sheet formulario abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.nombre ? 'Editar rutina' : 'Nueva rutina'}>
        {editando && (
          <EditorRutina
            key={editando.uid}
            rutina={editando}
            bloques={sugerencias}
            onCancelar={() => setEditando(null)}
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

      {/* Menús de opciones */}
      <Sheet abierto={accion?.tipo === 'menu-rutina' || accion?.tipo === 'menu-bloque'} onCerrar={cerrar} titulo="Opciones">
        {accion?.tipo === 'menu-rutina' && (
          <Menu
            opciones={[
              { icono: 'copiar', texto: 'Copiar a otros clientes', fn: () => setAccion({ tipo: 'copiar', rutinas: [accion.r] }) },
              { icono: 'documento', texto: 'Guardar como plantilla', fn: () => setAccion({ tipo: 'plantilla', rutinas: [accion.r], nombre: accion.r.nombre }) },
              { icono: 'editar', texto: 'Editar', fn: () => (setAccion(null), setEditando(accion.r)) },
            ]}
          />
        )}
        {accion?.tipo === 'menu-bloque' && (
          <Menu
            opciones={[
              { icono: 'calendario', texto: 'Duplicar como bloque siguiente', detalle: 'Para planificar la progresión: copia estas rutinas con las fechas que elijas.', fn: () => setAccion({ tipo: 'duplicar', b: accion.b }) },
              { icono: 'editar', texto: 'Cambiar nombre o fechas', fn: () => setAccion({ tipo: 'editar-bloque', b: accion.b }) },
              { icono: 'copiar', texto: 'Copiar a otros clientes', fn: () => setAccion({ tipo: 'copiar', rutinas: accion.b.rutinas, b: accion.b }) },
              { icono: 'documento', texto: 'Guardar como plantilla', fn: () => setAccion({ tipo: 'plantilla', rutinas: accion.b.rutinas, nombre: accion.b.nombre ?? '' }) },
              { icono: 'mas', texto: 'Agregar rutina a este bloque', fn: () => (setAccion(null), nueva(accion.b)) },
            ]}
          />
        )}
      </Sheet>

      {/* Formularios */}
      <Sheet formulario abierto={accion?.tipo === 'copiar'} onCerrar={cerrar} titulo="Copiar a otros clientes">
        {accion?.tipo === 'copiar' && (
          <FormAsignar
            rutinas={accion.rutinas.map(aBase)}
            excluir={cliente.id}
            textoBoton="Copiar"
            iniciales={{ bloque: accion.b?.nombre ?? '', inicio: accion.b?.inicio ?? '', semanas: semanasDe(accion.b?.inicio, accion.b?.fin) }}
            onCancelar={cerrar}
            onListo={(n) => listo(`Listo: se copió a ${n} ${n === 1 ? 'cliente' : 'clientes'}.`)}
          />
        )}
      </Sheet>
      <Sheet formulario abierto={accion?.tipo === 'duplicar'} onCerrar={cerrar} titulo="Duplicar bloque">
        {accion?.tipo === 'duplicar' && (
          <FormAsignar
            rutinas={accion.b.rutinas.map(aBase)}
            clienteFijo={cliente.id}
            textoBoton="Crear bloque"
            iniciales={{
              bloque: siguienteNombre(accion.b.nombre),
              inicio: accion.b.fin ? sumarDias(accion.b.fin, 1) : proximoLunes(),
              semanas: semanasDe(accion.b.inicio, accion.b.fin) || 1,
            }}
            onCancelar={cerrar}
            onListo={() => listo('Listo: se creó el bloque. Ajusta pesos o repeticiones tocando cada rutina.')}
          />
        )}
      </Sheet>
      <Sheet formulario abierto={accion?.tipo === 'editar-bloque'} onCerrar={cerrar} titulo="Editar bloque">
        {accion?.tipo === 'editar-bloque' && <FormEditarBloque b={accion.b} cliente={cliente.id} onCancelar={cerrar} onListo={() => listo('Listo: bloque actualizado.')} />}
      </Sheet>
      <Sheet formulario abierto={accion?.tipo === 'plantilla'} onCerrar={cerrar} titulo="Guardar como plantilla">
        {accion?.tipo === 'plantilla' && <FormNuevaPlantilla rutinas={accion.rutinas} nombre={accion.nombre} onCancelar={cerrar} onListo={(n) => listo(`Listo: “${n}” está en Mis clientes → Plantillas.`)} />}
      </Sheet>
      <Sheet formulario={!!(accion?.tipo === 'desde-plantilla' && accion.p)} abierto={accion?.tipo === 'desde-plantilla'} onCerrar={cerrar} titulo={accion?.tipo === 'desde-plantilla' && accion.p ? accion.p.nombre : 'Elige una plantilla'}>
        {accion?.tipo === 'desde-plantilla' &&
          (accion.p ? (
            <FormAsignar
              rutinas={accion.p.rutinas}
              clienteFijo={cliente.id}
              iniciales={{ bloque: accion.p.nombre, inicio: proximoLunes(), semanas: 1 }}
              onCancelar={cerrar}
              onListo={() => listo('Listo: se agregaron las rutinas de la plantilla.')}
            />
          ) : (
            <ElegirPlantilla onElegir={(p) => setAccion({ tipo: 'desde-plantilla', p })} />
          ))}
      </Sheet>
    </div>
  );
}

function Menu({ opciones }: { opciones: { icono: 'copiar' | 'documento' | 'editar' | 'calendario' | 'mas'; texto: string; detalle?: string; fn: () => void }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {opciones.map((o) => (
        <button key={o.texto} onClick={o.fn} className="bg-campo/50 hover:bg-campo flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition">
          <span className="bg-dorado/15 text-dorado grid size-9 shrink-0 place-items-center rounded-xl">
            <Icon name={o.icono} size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{o.texto}</span>
            {o.detalle && <span className="text-suave block text-xs">{o.detalle}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Cambia nombre y fechas de todas las rutinas de un bloque. */
function FormEditarBloque({ b, cliente, onCancelar, onListo }: { b: Bloque; cliente: string; onCancelar: () => void; onListo: () => void }) {
  const [v, setV] = useState<ValoresBloque>({ bloque: b.nombre ?? '', inicio: b.inicio ?? '', semanas: semanasDe(b.inicio, b.fin) });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const guardarBloque = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const cambios = { bloque: v.bloque.trim() || undefined, inicio: v.inicio || undefined, fin: finDe(v.inicio || undefined, v.semanas) };
      for (const r of b.rutinas) await guardarParaCliente(cliente, 'rutinas', r.uid!, limpiar({ ...r, ...cambios }));
      onListo();
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <form onSubmit={guardarBloque} className="flex flex-col gap-4">
      <CamposBloque v={v} onChange={setV} id="eb" />
      <p className="text-suave text-xs">Se aplica a {b.rutinas.length === 1 ? 'la rutina' : `las ${b.rutinas.length} rutinas`} de este bloque.</p>
      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="btn-sec">
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function FormNuevaPlantilla({ rutinas, nombre: inicial, onCancelar, onListo }: { rutinas: Rutina[]; nombre: string; onCancelar: () => void; onListo: (nombre: string) => void }) {
  const [nombre, setNombre] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const guardarP = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await guardarPlantilla({ uid: crypto.randomUUID(), nombre: nombre.trim(), rutinas: rutinas.map(aBase), creada: new Date().toISOString() });
      onListo(nombre.trim());
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <form onSubmit={guardarP} className="flex flex-col gap-4">
      <div>
        <label className="etiqueta" htmlFor="np-nombre">Nombre de la plantilla</label>
        <input id="np-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Ej.: Fuerza 3 días – principiante" maxLength={50} required autoFocus />
      </div>
      <p className="text-suave text-xs">
        Incluye {rutinas.length === 1 ? 'la rutina' : `${rutinas.length} rutinas`} ({rutinas.map((r) => r.nombre).join(', ')}) con sus días y ejercicios. No guarda fechas ni datos de tu cliente.
      </p>
      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="btn-sec">
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={guardando || !nombre.trim()}>
          {guardando ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Guía de alimentación ───────────── */

const MAX_MB = 20;
const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString('es', { maximumFractionDigits: 1 })} MB`);

/** Abre un archivo de la nube en otra pestaña (la ventana se abre antes de esperar, si no Safari la bloquea). */
async function abrirArchivo(path: string) {
  const ventana = window.open('', '_blank');
  try {
    const url = await urlFirmada('nutricion', path);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  } catch (e) {
    ventana?.close();
    alert(traducirError(e));
  }
}

function GuiaAlimentacion({ d, cliente, recargar }: { d: DatosCliente; cliente: PerfilNube; recargar: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string }>();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-suave text-sm">La guía más reciente aparece como “Guía actual” en las pestañas Comida y Hoy de tu cliente, y la puede abrir sin internet. Abajo ves su diario de comidas.</p>
      <button className="btn-oro w-full" onClick={() => setAbierto(true)}>
        <Icon name="subir" size={18} /> Subir guía de alimentación
      </button>
      {aviso && (
        <p role="status" className={`animate-entrada rounded-xl px-3 py-2 text-sm ${aviso.tipo === 'ok' ? 'bg-baja/10 text-baja' : 'bg-sube/10 text-sube'}`}>
          {aviso.texto}
        </p>
      )}
      {d.nutricion.length === 0 && <p className="tarjeta text-suave text-center text-sm">Aún no hay guías de alimentación.</p>}
      {d.nutricion.map((n, i) => (
        <div key={n.uid} className="tarjeta flex items-center gap-3 !p-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i === 0 ? 'bg-dorado/15 text-dorado' : 'bg-campo text-suave'}`}>
            <Icon name="documento" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{n.nombre}</p>
            <p className="text-suave text-xs">
              {i === 0 && 'Guía actual · '}
              {fechaRelativa(toISO(new Date(n.subidoEn)))}
            </p>
          </div>
          <button onClick={() => abrirArchivo(n.path)} className="text-dorado text-xs font-semibold">
            Ver
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Borrar "${n.nombre}"? Tu cliente ya no la verá.`)) return;
              try {
                await borrarPdf(cliente.id, n);
                await recargar();
                setAviso({ tipo: 'ok', texto: `Se borró “${n.nombre}”.` });
              } catch (e) {
                setAviso({ tipo: 'error', texto: `No se pudo borrar: ${traducirError(e)}` });
              }
            }}
            className="text-suave hover:text-sube p-1"
            aria-label={`Borrar ${n.nombre}`}
          >
            <Icon name="basura" size={16} />
          </button>
        </div>
      ))}

      <Sheet formulario abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nueva guía de alimentación">
        {abierto && (
          <FormGuia
            cliente={cliente}
            onCancelar={() => setAbierto(false)}
            onListo={async (nombre) => {
              setAbierto(false);
              setAviso({ tipo: 'ok', texto: `Listo: “${nombre}” ya está en la app de tu cliente.` });
              await recargar();
            }}
          />
        )}
      </Sheet>

      <DiarioComidas d={d} cliente={cliente} />
    </div>
  );
}

/** Diario de comidas del cliente (solo lectura). Las fotos se ven solo si el cliente comparte sus fotos. */
function DiarioComidas({ d, cliente }: { d: DatosCliente; cliente: PerfilNube }) {
  const [cuantas, setCuantas] = useState(20);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const visibles = d.comidas.slice(0, cuantas);
  useEffect(() => {
    if (!cliente.compartir_fotos) return;
    let vivo = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const c of visibles) if (c.path) out[c.uid] = await urlFirmada('fotos', c.path).catch(() => '');
      if (vivo) setUrls(out);
    })();
    return () => {
      vivo = false;
    };
  }, [d.comidas, cuantas, cliente.compartir_fotos]);

  return (
    <section className="mt-3">
      <h2 className="titulo text-champagne text-2xl leading-none">Diario de comidas</h2>
      {!cliente.compartir_fotos && d.comidas.some((c) => c.path) && <p className="text-suave mt-1 text-xs">Tu cliente no comparte sus fotos: solo ves sus comentarios.</p>}
      {d.comidas.length === 0 ? (
        <p className="tarjeta text-suave mt-2 text-center text-sm">Tu cliente aún no anota comidas.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {visibles.map((c, i) => (
            <div key={c.uid}>
              {(i === 0 || visibles[i - 1].fecha !== c.fecha) && <p className="text-suave mt-2 mb-1.5 text-xs font-semibold tracking-wider uppercase">{fechaRelativa(c.fecha)}</p>}
              <div className="tarjeta flex items-start gap-3 !p-2.5">
                {urls[c.uid] ? (
                  <a href={urls[c.uid]} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={urls[c.uid]} alt={`Foto de ${c.tipo.toLowerCase()}`} className="size-20 rounded-xl object-cover" />
                  </a>
                ) : (
                  <span className="bg-campo text-suave grid size-20 shrink-0 place-items-center rounded-xl">
                    <Icon name={c.path ? 'camara' : 'comida'} size={24} />
                  </span>
                )}
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-dorado text-sm font-semibold">{c.tipo}</span>
                    <span className="text-suave text-xs tabular-nums">{c.hora}</span>
                  </p>
                  {c.nota ? <p className="mt-0.5 text-sm whitespace-pre-line">{c.nota}</p> : <p className="text-suave mt-0.5 text-xs italic">Sin comentario</p>}
                </div>
              </div>
            </div>
          ))}
          {d.comidas.length > cuantas && (
            <button onClick={() => setCuantas((n) => n + 20)} className="btn-sec w-full">
              Ver más
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FormGuia({ cliente, onCancelar, onListo }: { cliente: PerfilNube; onCancelar: () => void; onListo: (nombre: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File>();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const elegir = (f: File | undefined) => {
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError('El archivo debe ser un PDF.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El PDF pesa más de ${MAX_MB} MB. Comprímelo e inténtalo de nuevo.`);
    setArchivo(f);
    if (!nombre.trim()) setNombre(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim());
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !nombre.trim()) return;
    setSubiendo(true);
    setError('');
    try {
      await subirPdf(cliente.id, archivo, nombre.trim());
      onListo(nombre.trim());
    } catch (err) {
      setError(`No se pudo subir la guía: ${traducirError(err)}`);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        <span className="etiqueta">Archivo PDF</span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-left transition ${archivo ? 'border-dorado/50 bg-dorado/[0.07]' : 'bg-campo border-white/15'}`}
        >
          <Icon name="documento" size={24} className="text-dorado shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{archivo ? archivo.name : 'Elegir PDF'}</span>
            <span className="text-suave block text-xs">{archivo ? `${tamano(archivo.size)} · toca para cambiarlo` : `Máximo ${MAX_MB} MB`}</span>
          </span>
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="guia-nombre">Nombre de la guía (lo verá tu cliente)</label>
        <input id="guia-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Ej.: Guía de alimentación · octubre" maxLength={80} />
      </div>
      {error && (
        <p role="alert" className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="btn-sec" disabled={subiendo}>
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={!archivo || !nombre.trim() || subiendo}>
          {subiendo ? 'Subiendo…' : 'Guardar'}
        </button>
      </div>
    </form>
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
