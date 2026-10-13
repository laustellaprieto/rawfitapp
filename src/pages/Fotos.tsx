import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { db, type Foto, type Pose } from '../lib/db';
import { diasEntre, fechaLarga, fechaRelativa, hoyISO } from '../lib/dates';
import { useBlobURL } from '../lib/hooks';
import { comprimirImagen } from '../lib/image';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { BotonAgregar, Encabezado, Segmentos, Vacio } from '../components/ui';

const POSES: { valor: Pose; texto: string }[] = [
  { valor: 'frente', texto: 'Frente' },
  { valor: 'perfil', texto: 'Perfil' },
  { valor: 'espalda', texto: 'Espalda' },
  { valor: 'otra', texto: 'Otra' },
];
const nombrePose = (p: Pose) => POSES.find((x) => x.valor === p)!.texto;

export default function Fotos() {
  const fotos = useLiveQuery(() => db.fotos.orderBy('fecha').reverse().toArray(), []);
  const [filtro, setFiltro] = useState<Pose | 'todas'>('todas');
  const [subir, setSubir] = useState(false);
  const [ver, setVer] = useState<Foto | null>(null);
  const [comparando, setComparando] = useState(false);
  const [sel, setSel] = useState<Foto[]>([]);
  const [comparar, setComparar] = useState<[Foto, Foto] | null>(null);

  const visibles = (fotos ?? []).filter((f) => filtro === 'todas' || f.pose === filtro);
  const grupos = useMemo(() => {
    const g = new Map<string, Foto[]>();
    for (const f of visibles) {
      if (!g.has(f.fecha)) g.set(f.fecha, []);
      g.get(f.fecha)!.push(f);
    }
    return [...g.entries()];
  }, [visibles]);

  const tocar = (f: Foto) => {
    if (!comparando) return setVer(f);
    const ya = sel.some((s) => s.id === f.id);
    const nueva = ya ? sel.filter((s) => s.id !== f.id) : [...sel, f].slice(-2);
    setSel(nueva);
    if (nueva.length === 2) {
      const [a, b] = [...nueva].sort((x, y) => x.fecha.localeCompare(y.fecha));
      setComparar([a, b]);
    }
  };

  const salirComparar = () => {
    setComparando(false);
    setSel([]);
  };

  return (
    <>
      <Encabezado subtitulo="Antes y después" titulo="Fotos" accion={<BotonAgregar onClick={() => setSubir(true)}>Agregar</BotonAgregar>} />

      {fotos !== undefined && fotos.length === 0 ? (
        <Vacio
          icono="camara"
          titulo="Tu punto de partida"
          texto="Las fotos muestran cambios que la báscula no ve. Tómalas con la misma luz, ropa y distancia cada 2–4 semanas. Se guardan solo en tu celular."
          accion={<BotonAgregar onClick={() => setSubir(true)}>Agregar fotos</BotonAgregar>}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Segmentos opciones={[{ valor: 'todas' as const, texto: 'Todas' }, ...POSES]} valor={filtro} onChange={setFiltro} />
            </div>
            {(fotos?.length ?? 0) >= 2 && (
              <button
                onClick={() => (comparando ? salirComparar() : setComparando(true))}
                className={`chip mb-1 inline-flex shrink-0 items-center gap-1 ${comparando ? 'bg-champagne text-fondo' : 'text-champagne bg-dorado/15'}`}
              >
                <Icon name="comparar" size={14} /> {comparando ? 'Cancelar' : 'Comparar'}
              </button>
            )}
          </div>
          {comparando && (
            <p className="animate-entrada text-champagne bg-dorado/10 mb-4 rounded-xl px-3 py-2 text-sm">
              Elige 2 fotos para comparar ({sel.length}/2)
            </p>
          )}

          <div className="flex flex-col gap-5">
            {grupos.map(([fecha, lista]) => (
              <section key={fecha} className="animate-entrada">
                <h2 className="text-suave mb-2 text-xs font-semibold tracking-wider uppercase">{fechaRelativa(fecha)}</h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {lista.map((f) => (
                    <Miniatura key={f.id} foto={f} onClick={() => tocar(f)} seleccionada={sel.findIndex((s) => s.id === f.id)} />
                  ))}
                </div>
              </section>
            ))}
            {grupos.length === 0 && <p className="text-suave py-10 text-center text-sm">No hay fotos con esta pose.</p>}
          </div>
        </>
      )}

      <SubirFotos abierto={subir} onCerrar={() => setSubir(false)} />
      <VisorFoto foto={ver} onCerrar={() => setVer(null)} />
      <Comparador
        par={comparar}
        onCerrar={() => {
          setComparar(null);
          salirComparar();
        }}
      />
    </>
  );
}

function Miniatura({ foto, onClick, seleccionada }: { foto: Foto; onClick: () => void; seleccionada: number }) {
  const url = useBlobURL(foto.imagen);
  return (
    <button
      onClick={onClick}
      className={`bg-campo relative aspect-[3/4] overflow-hidden rounded-2xl transition active:scale-95 ${seleccionada >= 0 ? 'ring-dorado ring-2 ring-offset-2 ring-offset-[#111]' : ''}`}
    >
      {url && <img src={url} alt={`Foto ${nombrePose(foto.pose)}`} className="size-full object-cover" loading="lazy" />}
      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium backdrop-blur">{nombrePose(foto.pose)}</span>
      {seleccionada >= 0 && (
        <span className="bg-dorado text-fondo animate-pop absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-xs font-bold">{seleccionada + 1}</span>
      )}
    </button>
  );
}

function SubirFotos({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [pose, setPose] = useState<Pose>('frente');
  const [guardando, setGuardando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const elegir = async (files: FileList | null) => {
    if (!files?.length) return;
    setGuardando(true);
    try {
      for (const file of Array.from(files)) {
        const imagen = await comprimirImagen(file);
        await db.fotos.add({ fecha, pose, imagen });
      }
      onCerrar();
    } catch {
      alert('No se pudo guardar la foto. Revisa que haya espacio disponible en tu dispositivo.');
    } finally {
      setGuardando(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Agregar fotos">
      <div className="flex flex-col gap-4">
        <div>
          <label className="etiqueta" htmlFor="fecha-foto">Fecha</label>
          <input id="fecha-foto" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" />
        </div>
        <div>
          <span className="etiqueta">Pose</span>
          <div className="grid grid-cols-4 gap-2">
            {POSES.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPose(p.valor)}
                className={`rounded-xl py-2.5 text-sm font-medium transition ${pose === p.valor ? 'bg-dorado text-fondo' : 'bg-campo text-suave'}`}
              >
                {p.texto}
              </button>
            ))}
          </div>
        </div>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => elegir(e.target.files)} />
        <button onClick={() => input.current?.click()} disabled={guardando || !fecha} className="btn-oro w-full !py-4">
          <Icon name="camara" size={20} />
          {guardando ? 'Guardando…' : 'Tomar o elegir fotos'}
        </button>
        <p className="text-suave flex items-start gap-2 text-xs">
          <Icon name="escudo" size={16} className="text-dorado shrink-0" />
          Tus fotos no se suben a internet: se guardan solo en este dispositivo.
        </p>
      </div>
    </Sheet>
  );
}

function VisorFoto({ foto, onCerrar }: { foto: Foto | null; onCerrar: () => void }) {
  const url = useBlobURL(foto?.imagen);
  if (!foto) return null;
  const eliminar = async () => {
    if (!confirm('¿Eliminar esta foto?')) return;
    await db.fotos.delete(foto.id!);
    onCerrar();
  };
  return (
    <div className="animate-entrada fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div>
          <p className="text-champagne text-sm font-semibold capitalize">{fechaLarga(foto.fecha)}</p>
          <p className="text-suave text-xs">{nombrePose(foto.pose)}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={eliminar} className="text-suave hover:text-sube rounded-full p-2.5" aria-label="Eliminar foto">
            <Icon name="basura" />
          </button>
          <button onClick={onCerrar} className="rounded-full p-2.5" aria-label="Cerrar">
            <Icon name="cerrar" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={onCerrar}>
        {url && <img src={url} alt="" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />}
      </div>
    </div>
  );
}

function Comparador({ par, onCerrar }: { par: [Foto, Foto] | null; onCerrar: () => void }) {
  const urlA = useBlobURL(par?.[0].imagen);
  const urlB = useBlobURL(par?.[1].imagen);
  const [pos, setPos] = useState(50);
  const [modo, setModo] = useState<'deslizar' | 'lado'>('deslizar');
  if (!par) return null;
  const [a, b] = par;
  const dias = diasEntre(a.fecha, b.fecha);

  return (
    <Sheet abierto onCerrar={onCerrar} titulo="Tu progreso">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-suave text-sm">
          {dias === 0 ? 'Mismo día' : <>{dias} {dias === 1 ? 'día' : 'días'} de diferencia</>}
        </p>
        <Segmentos
          opciones={[
            { valor: 'deslizar' as const, texto: 'Deslizar' },
            { valor: 'lado' as const, texto: 'Lado a lado' },
          ]}
          valor={modo}
          onChange={setModo}
        />
      </div>

      {modo === 'deslizar' ? (
        <div className="bg-campo relative mx-auto aspect-[3/4] max-h-[62dvh] w-full touch-none overflow-hidden rounded-2xl select-none">
          {urlB && <img src={urlB} alt="Después" className="absolute inset-0 size-full object-cover" />}
          {urlA && <img src={urlA} alt="Antes" className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
          <div className="bg-champagne pointer-events-none absolute inset-y-0 w-0.5" style={{ left: `${pos}%` }}>
            <div className="bg-champagne text-fondo absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-lg">
              <Icon name="comparar" size={18} />
            </div>
          </div>
          <Etiqueta texto="Antes" fecha={a.fecha} className="left-2" />
          <Etiqueta texto="Después" fecha={b.fecha} className="right-2 text-right" />
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            className="absolute inset-0 size-full cursor-ew-resize opacity-0"
            aria-label="Deslizar para comparar"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            [a, urlA, 'Antes'],
            [b, urlB, 'Después'],
          ].map(([f, url, t]) => (
            <div key={t as string} className="bg-campo relative aspect-[3/4] overflow-hidden rounded-2xl">
              {url && <img src={url as string} alt={t as string} className="size-full object-cover" />}
              <Etiqueta texto={t as string} fecha={(f as Foto).fecha} className="left-2" />
            </div>
          ))}
        </div>
      )}
    </Sheet>
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
