import { useCallback, useEffect, useMemo, useState } from 'react';
import { cambiarEstadoOpinion, ESTADOS_OPINION, listarOpiniones, TIPOS_OPINION, urlCaptura, type EstadoOpinion, type Opinion, type TipoOpinion } from '../../lib/feedback';
import { fechaRelativa, toISO } from '../../lib/fechas';
import { traducirError } from '../../lib/nube';
import { Icon } from '../../components/Icon';
import { Segmentos, Vacio } from '../../components/ui';

const COLOR_ESTADO: Record<EstadoOpinion, string> = {
  nueva: 'bg-dorado text-fondo',
  revisada: 'bg-champagne/15 text-champagne',
  implementada: 'bg-baja/15 text-baja',
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/** Pestaña "Feedback" del panel de coach: opiniones de testers, más nuevas primero. */
export function Opiniones({ onNuevas }: { onNuevas?: (n: number) => void }) {
  const [lista, setLista] = useState<Opinion[]>();
  const [error, setError] = useState('');
  const [tipo, setTipo] = useState<'todos' | TipoOpinion>('todos');
  const [estado, setEstado] = useState<'todos' | EstadoOpinion>('todos');

  const cargar = useCallback(async () => {
    try {
      setLista(await listarOpiniones());
      setError('');
    } catch (e) {
      setError(traducirError(e));
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    if (lista) onNuevas?.(lista.filter((o) => o.estado === 'nueva').length);
  }, [lista, onNuevas]);

  const filtradas = useMemo(() => (lista ?? []).filter((o) => (tipo === 'todos' || o.tipo === tipo) && (estado === 'todos' || o.estado === estado)), [lista, tipo, estado]);
  const promedio = lista?.length ? lista.reduce((t, o) => t + o.estrellas, 0) / lista.length : 0;

  const cambiar = async (o: Opinion, nuevo: EstadoOpinion) => {
    const antes = o.estado;
    setLista((l) => l?.map((x) => (x.id === o.id ? { ...x, estado: nuevo } : x)));
    try {
      await cambiarEstadoOpinion(o.id, nuevo);
    } catch (e) {
      setLista((l) => l?.map((x) => (x.id === o.id ? { ...x, estado: antes } : x)));
      alert(traducirError(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">
          {error}{' '}
          <button className="font-semibold underline" onClick={cargar}>
            Reintentar
          </button>
        </p>
      )}
      {lista === undefined && !error && <p className="text-suave py-6 text-center text-sm">Cargando…</p>}
      {lista && lista.length > 0 && (
        <p className="text-suave text-sm">
          {lista.length} {lista.length === 1 ? 'opinión' : 'opiniones'} · promedio <b className="text-dorado">{promedio.toLocaleString('es', { maximumFractionDigits: 1 })} ★</b>
        </p>
      )}
      {lista && lista.length > 0 && (
        <>
          <Segmentos
            opciones={[{ valor: 'todos' as const, texto: 'Todos los tipos' }, ...TIPOS_OPINION.map((t) => ({ valor: t.valor, texto: `${t.emoji} ${t.texto}` }))]}
            valor={tipo}
            onChange={setTipo}
          />
          <Segmentos
            opciones={[
              { valor: 'todos' as const, texto: 'Todos los estados' },
              ...ESTADOS_OPINION.map((e) => ({ valor: e.valor, texto: `${e.texto} (${lista.filter((o) => o.estado === e.valor).length})` })),
            ]}
            valor={estado}
            onChange={setEstado}
          />
        </>
      )}
      {lista?.length === 0 && <Vacio icono="info" titulo="Sin opiniones todavía" texto="Cuando alguien toque “Danos tu opinión” en Ajustes, aparecerá aquí." />}
      {lista && lista.length > 0 && filtradas.length === 0 && <p className="tarjeta text-suave text-center text-sm">No hay opiniones con estos filtros.</p>}
      {filtradas.map((o) => (
        <TarjetaOpinion key={o.id} o={o} onEstado={(e) => cambiar(o, e)} />
      ))}
    </div>
  );
}

function TarjetaOpinion({ o, onEstado }: { o: Opinion; onEstado: (e: EstadoOpinion) => void }) {
  const t = TIPOS_OPINION.find((x) => x.valor === o.tipo);
  const [captura, setCaptura] = useState<string>();
  useEffect(() => {
    if (!o.imagen_path) return;
    let vivo = true;
    urlCaptura(o.imagen_path)
      .then((u) => vivo && setCaptura(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [o.imagen_path]);

  return (
    <article className={`tarjeta animate-entrada !p-3.5 ${o.estado === 'nueva' ? '!border-dorado/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {t?.emoji} {t?.texto ?? o.tipo}
          </p>
          <p className="text-dorado text-sm tracking-wider" aria-label={`${o.estrellas} de 5 estrellas`}>
            {'★'.repeat(o.estrellas)}
            <span className="text-[#444]">{'★'.repeat(5 - o.estrellas)}</span>
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${COLOR_ESTADO[o.estado]}`}>{ESTADOS_OPINION.find((e) => e.valor === o.estado)?.texto}</span>
      </div>

      <p className="mt-2 text-sm whitespace-pre-line">{o.texto}</p>

      {o.imagen_path &&
        (captura ? (
          <a href={captura} target="_blank" rel="noreferrer" className="mt-2.5 block w-fit">
            <img src={captura} alt="Captura adjunta" className="max-h-56 rounded-xl border border-white/10" />
          </a>
        ) : (
          <p className="text-suave mt-2 flex items-center gap-1.5 text-xs">
            <Icon name="fotos-galeria" size={14} /> Cargando captura…
          </p>
        ))}

      <p className="text-suave mt-2.5 text-xs">
        <b className="text-texto/80">{o.nombre || 'Sin nombre'}</b>
        {o.user_id ? '' : ' · sin cuenta'} · {fechaRelativa(toISO(new Date(o.creado_en)))} {hora(o.creado_en)}
      </p>
      <p className="text-suave text-xs">
        {o.pantalla && <>Pantalla: {o.pantalla} · </>}Versión {o.version ?? '—'}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Estado">
        {ESTADOS_OPINION.map((e) => (
          <button
            key={e.valor}
            type="button"
            aria-pressed={o.estado === e.valor}
            onClick={() => o.estado !== e.valor && onEstado(e.valor)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${o.estado === e.valor ? 'bg-dorado/15 text-dorado ring-dorado/40 ring-1' : 'bg-campo text-suave hover:text-texto'}`}
          >
            {e.texto}
          </button>
        ))}
      </div>
    </article>
  );
}
