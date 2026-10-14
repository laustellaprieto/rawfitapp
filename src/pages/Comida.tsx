import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { db, TIPOS_COMIDA, type Comida as EntradaComida, type TipoComida } from '../lib/db';
import { fechaLarga, fechaRelativa, hoyISO, sumarDias } from '../lib/fechas';
import { useBlobURL } from '../lib/hooks';
import { aBlob, comprimirImagen, paraGuardar } from '../lib/image';
import { useCuenta } from '../lib/nube';
import { Icon } from '../components/Icon';
import { TarjetaNutricion } from '../components/PlanCoach';
import { Sheet } from '../components/Sheet';
import { BotonAgregar, Encabezado, Segmentos } from '../components/ui';

const pad = (n: number) => String(n).padStart(2, '0');
const horaActual = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** Tipo sugerido según la hora. */
const tipoPorHora = (hora: string): TipoComida => {
  const h = Number(hora.slice(0, 2));
  if (h < 11) return 'Desayuno';
  if (h < 16) return 'Almuerzo';
  if (h < 19) return 'Snack';
  return 'Cena';
};
const nueva = (): EntradaComida => {
  const hora = horaActual();
  return { fecha: hoyISO(), hora, tipo: tipoPorHora(hora) };
};

const DIAS_POR_PAGINA = 14;

export default function Comida() {
  const [dias, setDias] = useState(DIAS_POR_PAGINA);
  const desde = sumarDias(hoyISO(), -(dias - 1));
  const entradas = useLiveQuery(() => db.comidas.where('fecha').aboveOrEqual(desde).toArray(), [desde]);
  const hayMas = useLiveQuery(() => db.comidas.where('fecha').below(desde).count(), [desde]);
  const [editando, setEditando] = useState<EntradaComida | null>(null);
  const conCoach = useCuenta().perfil?.estado === 'aceptado';

  const porDia = useMemo(() => {
    const g = new Map<string, EntradaComida[]>();
    for (const e of [...(entradas ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))) {
      g.set(e.fecha, [...(g.get(e.fecha) ?? []), e]);
    }
    return [...g.entries()];
  }, [entradas]);

  return (
    <>
      <Encabezado subtitulo="Come con intención" titulo="Comida" />

      <TarjetaNutricion mostrarVacia />

      <section className="animate-entrada mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="titulo text-champagne text-2xl leading-none">Diario de comidas</h2>
          <p className="text-suave mt-1 text-xs">Toma una foto y cuenta cómo te sentiste.{conCoach && ' Tu coach puede leerlo.'}</p>
        </div>
        <BotonAgregar onClick={() => setEditando(nueva())}>Anotar</BotonAgregar>
      </section>

      {entradas && entradas.length === 0 && !hayMas && (
        <button onClick={() => setEditando(nueva())} className="tarjeta animate-entrada flex w-full flex-col items-center px-6 py-10 text-center">
          <span className="bg-dorado/10 text-dorado mb-4 grid size-14 place-items-center rounded-2xl">
            <Icon name="camara" size={28} />
          </span>
          <span className="titulo text-2xl">Tu primera comida</span>
          <span className="text-suave mt-1 text-sm">Sácale una foto a tu plato y anota qué comiste, si tenías hambre o cómo te sentiste después.</span>
        </button>
      )}

      <div className="flex flex-col gap-5">
        {porDia.map(([fecha, lista]) => (
          <section key={fecha} className="animate-entrada">
            <p className="text-suave mb-2 text-xs font-semibold tracking-wider uppercase">
              {fechaRelativa(fecha)} <span className="font-normal normal-case">· {lista.length} {lista.length === 1 ? 'registro' : 'registros'}</span>
            </p>
            <div className="flex flex-col gap-2">
              {lista.map((e) => (
                <TarjetaComida key={e.id} e={e} onAbrir={() => setEditando(e)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!!hayMas && (
        <button onClick={() => setDias((d) => d + DIAS_POR_PAGINA)} className="btn-sec mt-4 w-full">
          Ver días anteriores
        </button>
      )}

      <Sheet formulario abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar comida' : 'Anotar comida'}>
        {editando && <FormComida key={editando.id ?? 'nueva'} entrada={editando} onCerrar={() => setEditando(null)} />}
      </Sheet>
    </>
  );
}

function TarjetaComida({ e, onAbrir }: { e: EntradaComida; onAbrir: () => void }) {
  const url = useBlobURL(e.imagen);
  return (
    <button onClick={onAbrir} className="tarjeta flex w-full items-start gap-3 !p-2.5 text-left transition hover:!border-white/10">
      {url ? (
        <img src={url} alt={`Foto de ${e.tipo.toLowerCase()}`} className="size-20 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="bg-campo text-suave grid size-20 shrink-0 place-items-center rounded-xl">
          <Icon name="comida" size={26} />
        </span>
      )}
      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-dorado text-sm font-semibold">{e.tipo}</span>
          <span className="text-suave text-xs tabular-nums">{e.hora}</span>
        </span>
        {e.nota ? <span className="text-texto/90 mt-0.5 line-clamp-3 block text-sm whitespace-pre-line">{e.nota}</span> : <span className="text-suave mt-0.5 block text-xs italic">Sin comentario</span>}
      </span>
    </button>
  );
}

function FormComida({ entrada, onCerrar }: { entrada: EntradaComida; onCerrar: () => void }) {
  const [fecha, setFecha] = useState(entrada.fecha);
  const [hora, setHora] = useState(entrada.hora);
  const [tipo, setTipo] = useState<TipoComida>(entrada.tipo);
  const [nota, setNota] = useState(entrada.nota ?? '');
  // La foto se edita como Blob en memoria; se guarda como bytes (ver ArchivoGuardado).
  const [inicial] = useState(() => aBlob(entrada.imagen));
  const [imagen, setImagen] = useState<Blob | undefined>(inicial);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const url = useBlobURL(imagen);

  const elegir = async (f?: File) => {
    if (!f) return;
    setProcesando(true);
    try {
      setImagen(await comprimirImagen(f, 1280, 0.8));
    } finally {
      setProcesando(false);
    }
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true);
    try {
      const cambioFoto = imagen !== inicial;
      const datos: EntradaComida = {
        ...entrada,
        fecha,
        hora,
        tipo,
        nota: nota.trim() || undefined,
        imagen: !imagen ? undefined : cambioFoto ? await paraGuardar(imagen) : entrada.imagen,
        fotoV: imagen ? (cambioFoto ? Date.now() : entrada.fotoV) : undefined,
      };
      if (entrada.id) await db.comidas.put(datos);
      else await db.comidas.add(datos);
      onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar este registro del diario?')) return;
    await db.comidas.delete(entrada.id!);
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        {url ? (
          <div className="relative overflow-hidden rounded-2xl">
            <img src={url} alt="Foto de la comida" className="max-h-72 w-full object-cover" />
            <button type="button" onClick={() => setImagen(undefined)} className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/60" aria-label="Quitar foto">
              <Icon name="cerrar" size={18} />
            </button>
          </div>
        ) : (
          <div className="bg-campo/50 text-suave grid h-36 place-items-center rounded-2xl border border-dashed border-white/10 text-sm">
            {procesando ? 'Procesando foto…' : 'Foto opcional'}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => camara.current?.click()} className="btn-sec !py-2.5 text-sm">
            <Icon name="camara" size={18} /> {url ? 'Otra foto' : 'Tomar foto'}
          </button>
          <button type="button" onClick={() => galeria.current?.click()} className="btn-sec !py-2.5 text-sm">
            <Icon name="fotos-galeria" size={18} /> Galería
          </button>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (elegir(e.target.files?.[0]), (e.target.value = ''))} />
        <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => (elegir(e.target.files?.[0]), (e.target.value = ''))} />
      </div>

      <div>
        <span className="etiqueta">Momento</span>
        <Segmentos opciones={TIPOS_COMIDA.map((t) => ({ valor: t, texto: t }))} valor={tipo} onChange={setTipo} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="c-fecha">Fecha</label>
          <input id="c-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} className="campo" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="c-hora">Hora</label>
          <input id="c-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="campo" required />
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="c-nota">Comentario</label>
        <textarea
          id="c-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="campo min-h-28 resize-none"
          placeholder="¿Qué comiste? ¿Tenías hambre? ¿Cómo te sentiste después?"
          maxLength={1000}
        />
      </div>
      {fecha !== hoyISO() && <p className="text-suave -mt-2 text-xs">Queda anotada para el {fechaLarga(fecha)}.</p>}

      <div className="flex gap-2">
        {entrada.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar registro">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button type="button" onClick={onCerrar} className="btn-sec">
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={guardando || procesando || !fecha || !hora || (!imagen && !nota.trim())}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
