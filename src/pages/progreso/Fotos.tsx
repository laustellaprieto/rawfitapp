import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { db, type Checkin, type Foto, type Perfil, type Pose } from '../../lib/db';
import { diasEntre, fechaCorta, fechaLarga, fechaRelativa, hoyISO, mesDe, nombreMes } from '../../lib/fechas';
import { num, parseNum } from '../../lib/format';
import { useBlobURL } from '../../lib/hooks';
import { comprimirImagen } from '../../lib/image';
import { estadoCheckinFotos } from '../../lib/progreso';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { BotonAgregar, Segmentos, Vacio } from '../../components/ui';

export const POSES: { valor: Pose; texto: string }[] = [
  { valor: 'frente', texto: 'Frente' },
  { valor: 'perfil', texto: 'Perfil' },
  { valor: 'espalda', texto: 'Espalda' },
];

interface CheckinConFotos extends Checkin {
  fotos: Partial<Record<Pose, Foto>>;
}

function useCheckins() {
  return useLiveQuery(async () => {
    const [checkins, fotos] = await Promise.all([db.checkins.orderBy('fecha').reverse().toArray(), db.fotos.toArray()]);
    return checkins.map<CheckinConFotos>((c) => ({ ...c, fotos: Object.fromEntries(fotos.filter((f) => f.checkinId === c.id).map((f) => [f.pose, f])) }));
  }, []);
}

export default function Fotos({ perfil }: { perfil: Perfil }) {
  const checkins = useCheckins();
  const lista = useMemo(() => checkins ?? [], [checkins]);
  const [editando, setEditando] = useState<Checkin | null>(null);
  const [ver, setVer] = useState<{ foto: Foto; checkin: Checkin } | null>(null);
  const [comparar, setComparar] = useState(false);

  const estado = estadoCheckinFotos(perfil.fechaInicio, lista.map((c) => c.fecha));
  const porMes = useMemo(() => {
    const g = new Map<string, CheckinConFotos[]>();
    for (const c of lista) {
      const m = mesDe(c.fecha);
      if (!g.has(m)) g.set(m, []);
      g.get(m)!.push(c);
    }
    return [...g.entries()];
  }, [lista]);

  const nuevo = () => setEditando({ fecha: hoyISO() });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-suave text-sm">Un check-in cada 15 días.</p>
        <BotonAgregar onClick={nuevo}>Nuevo check-in</BotonAgregar>
      </div>

      <div className="bg-dorado/[0.08] border-dorado/20 animate-entrada mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3">
        <Icon name="camara" size={20} className="text-dorado shrink-0" />
        <div className="text-sm">
          <p className="text-champagne font-semibold">Misma luz, ropa, hora y distancia.</p>
          <p className="text-suave text-xs">
            {estado.pendiente
              ? estado.numero === 0
                ? 'Toca tu check-in inicial.'
                : `Toca tu check-in de progreso (día ${estado.numero * 15 + 1}).`
              : `Próximo check-in ${estado.faltan === 1 ? 'mañana' : `en ${estado.faltan} días`}.`}
          </p>
        </div>
      </div>

      {checkins !== undefined && lista.length === 0 ? (
        <Vacio
          icono="camara"
          titulo="Tu punto de partida"
          texto="Las fotos muestran cambios que la báscula no ve. Toma 3 fotos (frente, perfil y espalda). Se guardan solo en tu celular."
          accion={<BotonAgregar onClick={nuevo}>Primer check-in</BotonAgregar>}
        />
      ) : (
        <>
          {lista.length >= 2 && (
            <button onClick={() => setComparar(true)} className="btn-sec animate-entrada mb-5 w-full">
              <Icon name="comparar" size={18} /> Comparar antes / después
            </button>
          )}
          <div className="flex flex-col gap-6">
            {porMes.map(([mes, cs]) => (
              <section key={mes} className="animate-entrada">
                <h2 className="titulo text-suave mb-2 text-xl">{nombreMes(mes)}</h2>
                <div className="flex flex-col gap-3">
                  {cs.map((c) => (
                    <div key={c.id} className="tarjeta !p-3">
                      <div className="mb-2.5 flex items-start justify-between gap-2 px-1">
                        <div>
                          <p className="text-champagne text-sm font-semibold">{fechaRelativa(c.fecha)}</p>
                          <p className="text-suave text-xs">
                            Día {diasEntre(perfil.fechaInicio, c.fecha) + 1}
                            {c.peso !== undefined && ` · ${num(c.peso)} kg`}
                          </p>
                        </div>
                        <button onClick={() => setEditando(c)} className="text-suave hover:text-texto -m-1 p-1.5" aria-label="Editar check-in">
                          <Icon name="editar" size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {POSES.map((p) => (
                          <Miniatura key={p.valor} foto={c.fotos[p.valor]} pose={p.texto} onClick={() => c.fotos[p.valor] && setVer({ foto: c.fotos[p.valor]!, checkin: c })} />
                        ))}
                      </div>
                      {c.nota && <p className="text-texto/80 mt-2.5 px-1 text-sm italic">“{c.nota}”</p>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <Sheet abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar check-in' : 'Nuevo check-in'}>
        {editando && <FormCheckin key={editando.id ?? 'nuevo'} checkin={editando} existentes={lista} onCerrar={() => setEditando(null)} />}
      </Sheet>
      {ver && <Visor foto={ver.foto} checkin={ver.checkin} onCerrar={() => setVer(null)} />}
      <Sheet abierto={comparar} onCerrar={() => setComparar(false)} titulo="Antes / después">
        {comparar && <Comparador checkins={lista} />}
      </Sheet>
    </>
  );
}

function Miniatura({ foto, pose, onClick }: { foto?: Foto; pose: string; onClick?: () => void }) {
  const url = useBlobURL(foto?.imagen);
  return (
    <button onClick={onClick} disabled={!foto} className="bg-campo relative aspect-[3/4] overflow-hidden rounded-xl transition active:scale-95 disabled:active:scale-100">
      {url ? <img src={url} alt={pose} className="size-full object-cover" loading="lazy" /> : <span className="text-suave/50 grid size-full place-items-center"><Icon name="camara" size={20} /></span>}
      <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">{pose}</span>
    </button>
  );
}

/** Ranura para una pose: muestra la foto elegida y permite tomarla con la cámara o elegirla de la galería. */
function RanuraFoto({ pose, archivo, actual, onElegir, onQuitar }: { pose: string; archivo?: Blob; actual?: Blob; onElegir: (f: File) => void; onQuitar: () => void }) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const url = useBlobURL(archivo ?? actual);
  return (
    <div>
      <div className="bg-campo relative mb-1.5 aspect-[3/4] overflow-hidden rounded-xl">
        {url ? (
          <>
            <img src={url} alt={pose} className="size-full object-cover" />
            <button type="button" onClick={onQuitar} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60" aria-label={`Quitar foto de ${pose}`}>
              <Icon name="cerrar" size={14} />
            </button>
          </>
        ) : (
          <span className="text-suave/60 grid size-full place-items-center text-xs">{pose}</span>
        )}
      </div>
      <p className="mb-1 text-center text-xs font-semibold">{pose}</p>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={() => camara.current?.click()} className="bg-dorado/15 text-dorado grid place-items-center rounded-lg py-2" aria-label={`Tomar foto de ${pose}`}>
          <Icon name="camara" size={16} />
        </button>
        <button type="button" onClick={() => galeria.current?.click()} className="bg-campo text-suave grid place-items-center rounded-lg py-2" aria-label={`Elegir foto de ${pose} de la galería`}>
          <Icon name="fotos-galeria" size={16} />
        </button>
      </div>
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onElegir(e.target.files[0])} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onElegir(e.target.files[0])} />
    </div>
  );
}

function FormCheckin({ checkin, existentes, onCerrar }: { checkin: Checkin; existentes: CheckinConFotos[]; onCerrar: () => void }) {
  const ultimaMedicion = useLiveQuery(() => db.mediciones.orderBy('fecha').filter((m) => m.peso !== undefined).last(), []);
  const actuales = existentes.find((c) => c.id === checkin.id)?.fotos ?? {};
  const [fecha, setFecha] = useState(checkin.fecha);
  const [peso, setPeso] = useState(checkin.peso?.toString() ?? '');
  const [nota, setNota] = useState(checkin.nota ?? '');
  const [nuevas, setNuevas] = useState<Partial<Record<Pose, Blob>>>({});
  const [quitadas, setQuitadas] = useState<Pose[]>([]);
  const [guardando, setGuardando] = useState(false);

  const elegir = async (pose: Pose, f: File) => {
    const blob = await comprimirImagen(f);
    setNuevas((n) => ({ ...n, [pose]: blob }));
    setQuitadas((q) => q.filter((x) => x !== pose));
  };

  const tieneFoto = POSES.some((p) => nuevas[p.valor] || (actuales[p.valor] && !quitadas.includes(p.valor)));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await db.transaction('rw', db.checkins, db.fotos, async () => {
        const datos: Checkin = { fecha, peso: parseNum(peso), nota: nota.trim() || undefined };
        const id = checkin.id ?? ((await db.checkins.add(datos)) as number);
        if (checkin.id) await db.checkins.put({ ...datos, id });
        for (const p of POSES.map((x) => x.valor)) {
          const previa = actuales[p];
          if ((nuevas[p] || quitadas.includes(p)) && previa) await db.fotos.delete(previa.id!);
          if (nuevas[p]) await db.fotos.add({ checkinId: id, pose: p, imagen: nuevas[p]! });
        }
      });
      onCerrar();
    } catch {
      alert('No se pudo guardar. Revisa que haya espacio disponible en tu dispositivo.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar este check-in y sus fotos?')) return;
    await db.transaction('rw', db.checkins, db.fotos, async () => {
      await db.fotos.where('checkinId').equals(checkin.id!).delete();
      await db.checkins.delete(checkin.id!);
    });
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-champagne bg-dorado/10 rounded-xl px-3 py-2 text-center text-xs font-medium">Misma luz, ropa, hora y distancia.</p>
      <div className="grid grid-cols-3 gap-2.5">
        {POSES.map((p) => (
          <RanuraFoto
            key={p.valor}
            pose={p.texto}
            archivo={nuevas[p.valor]}
            actual={quitadas.includes(p.valor) ? undefined : actuales[p.valor]?.imagen}
            onElegir={(f) => elegir(p.valor, f)}
            onQuitar={() => {
              setNuevas((n) => ({ ...n, [p.valor]: undefined }));
              setQuitadas((q) => [...q, p.valor]);
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="c-fecha">Fecha</label>
          <input id="c-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="c-peso">Peso del día (kg)</label>
          <input
            id="c-peso"
            inputMode="decimal"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="campo"
            placeholder={ultimaMedicion?.peso ? num(ultimaMedicion.peso) : '—'}
          />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="c-nota">¿Cómo te sientes?</label>
        <textarea id="c-nota" value={nota} onChange={(e) => setNota(e.target.value)} className="campo min-h-20 resize-none" placeholder="Energía, ánimo, cómo te queda la ropa…" maxLength={280} />
      </div>
      <p className="text-suave flex items-start gap-2 text-xs">
        <Icon name="escudo" size={16} className="text-dorado shrink-0" />
        Tus fotos no se suben a internet: se guardan solo en este dispositivo.
      </p>
      <div className="flex gap-2">
        {checkin.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar check-in">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button className="btn-oro flex-1" disabled={guardando || !tieneFoto || !fecha}>
          {guardando ? 'Guardando…' : 'Guardar check-in'}
        </button>
      </div>
    </form>
  );
}

function Visor({ foto, checkin, onCerrar }: { foto: Foto; checkin: Checkin; onCerrar: () => void }) {
  const url = useBlobURL(foto.imagen);
  return (
    <div className="animate-entrada fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div>
          <p className="text-champagne text-sm font-semibold first-letter:uppercase">{fechaLarga(checkin.fecha)}</p>
          <p className="text-suave text-xs">
            {POSES.find((p) => p.valor === foto.pose)?.texto}
            {checkin.peso !== undefined && ` · ${num(checkin.peso)} kg`}
          </p>
        </div>
        <button onClick={onCerrar} className="rounded-full p-2.5" aria-label="Cerrar">
          <Icon name="cerrar" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={onCerrar}>
        {url && <img src={url} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />}
      </div>
    </div>
  );
}

function Comparador({ checkins }: { checkins: CheckinConFotos[] }) {
  const ordenados = [...checkins].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const [antesId, setAntesId] = useState(ordenados[0]?.id);
  const [despuesId, setDespuesId] = useState(ordenados[ordenados.length - 1]?.id);
  const [pose, setPose] = useState<Pose>('frente');
  const [modo, setModo] = useState<'deslizar' | 'lado'>('deslizar');
  const [pos, setPos] = useState(50);
  const antes = ordenados.find((c) => c.id === antesId);
  const despues = ordenados.find((c) => c.id === despuesId);
  const urlA = useBlobURL(antes?.fotos[pose]?.imagen);
  const urlB = useBlobURL(despues?.fotos[pose]?.imagen);
  const dias = antes && despues ? diasEntre(antes.fecha, despues.fecha) : 0;
  const difPeso = antes?.peso !== undefined && despues?.peso !== undefined ? despues.peso - antes.peso : undefined;

  const opcion = (c: CheckinConFotos) => (
    <option key={c.id} value={c.id}>
      {fechaCorta(c.fecha)} {c.fecha.slice(0, 4)}
      {c.peso !== undefined ? ` · ${num(c.peso)} kg` : ''}
    </option>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="etiqueta" htmlFor="cmp-a">Antes</label>
          <select id="cmp-a" value={antesId} onChange={(e) => setAntesId(Number(e.target.value))} className="campo !py-2.5 text-sm">
            {ordenados.map(opcion)}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="cmp-b">Después</label>
          <select id="cmp-b" value={despuesId} onChange={(e) => setDespuesId(Number(e.target.value))} className="campo !py-2.5 text-sm">
            {ordenados.map(opcion)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Segmentos opciones={POSES} valor={pose} onChange={setPose} />
        <Segmentos
          opciones={[
            { valor: 'deslizar' as const, texto: 'Deslizar' },
            { valor: 'lado' as const, texto: 'Lado a lado' },
          ]}
          valor={modo}
          onChange={setModo}
        />
      </div>
      <p className="text-suave text-center text-xs">
        {dias} {dias === 1 ? 'día' : 'días'} de diferencia
        {difPeso !== undefined && (
          <>
            {' · '}
            <span className={difPeso < 0 ? 'text-baja' : difPeso > 0 ? 'text-sube' : ''}>
              {difPeso > 0 ? '+' : difPeso < 0 ? '−' : ''}
              {num(Math.abs(difPeso))} kg
            </span>
          </>
        )}
      </p>

      {!urlA || !urlB ? (
        <p className="tarjeta text-suave text-center text-sm">Falta la foto de {POSES.find((p) => p.valor === pose)?.texto.toLowerCase()} en uno de los check-ins.</p>
      ) : modo === 'deslizar' ? (
        <div className="bg-campo relative mx-auto aspect-[3/4] max-h-[60dvh] w-full touch-none overflow-hidden rounded-2xl select-none">
          <img src={urlB} alt="Después" className="absolute inset-0 size-full object-cover" />
          <img src={urlA} alt="Antes" className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          <div className="bg-champagne pointer-events-none absolute inset-y-0 w-0.5" style={{ left: `${pos}%` }}>
            <div className="bg-champagne text-fondo absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-lg">
              <Icon name="comparar" size={18} />
            </div>
          </div>
          <Etiqueta texto="Antes" fecha={antes!.fecha} className="left-2" />
          <Etiqueta texto="Después" fecha={despues!.fecha} className="right-2 text-right" />
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-0 size-full cursor-ew-resize opacity-0" aria-label="Deslizar para comparar" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            { url: urlA, t: 'Antes', c: antes! },
            { url: urlB, t: 'Después', c: despues! },
          ].map(({ url, t, c }) => (
            <div key={t} className="bg-campo relative aspect-[3/4] overflow-hidden rounded-2xl">
              <img src={url} alt={t} className="size-full object-cover" />
              <Etiqueta texto={t} fecha={c.fecha} className="left-2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Etiqueta({ texto, fecha, className }: { texto: string; fecha: string; className: string }) {
  return (
    <div className={`pointer-events-none absolute top-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur ${className}`}>
      <p className="text-champagne text-[11px] font-bold tracking-wider uppercase">{texto}</p>
      <p className="text-[10px] text-white/80">{fechaRelativa(fecha)}</p>
    </div>
  );
}
