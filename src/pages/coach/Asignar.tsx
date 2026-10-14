import { useEffect, useState } from 'react';
import { asignarRutinas, listarPerfiles, type RutinaBase } from '../../lib/coach';
import { fechaCorta, hoyISO, inicioSemana, sumarDias } from '../../lib/fechas';
import { finDe, semanasDe } from '../../lib/rutinas';
import { traducirError, type PerfilNube } from '../../lib/nube';
import { Icon } from '../../components/Icon';
import { Avatar, nombreDe } from './comun';

export interface ValoresBloque {
  bloque: string;
  inicio: string;
  semanas: number; // 0 = sin fecha de fin
}

/** Lunes de la próxima semana (fecha de inicio sugerida para un bloque nuevo). */
export const proximoLunes = () => sumarDias(inicioSemana(hoyISO()), 7);

/** Nombre, fecha de inicio y duración de un bloque o semana. */
export function CamposBloque({
  v,
  onChange,
  id,
  sugerencias = [],
}: {
  v: ValoresBloque;
  onChange: (v: ValoresBloque) => void;
  id: string;
  sugerencias?: { nombre?: string; inicio?: string; fin?: string }[];
}) {
  const fin = finDe(v.inicio || undefined, v.semanas);
  const nombres = [...new Set(sugerencias.map((s) => s.nombre).filter(Boolean))] as string[];
  // Al elegir un bloque que ya existe, se usan sus fechas.
  const cambiarNombre = (bloque: string) => {
    const existe = sugerencias.find((s) => s.nombre && s.nombre.trim().toLowerCase() === bloque.trim().toLowerCase());
    onChange(existe ? { bloque, inicio: existe.inicio ?? '', semanas: semanasDe(existe.inicio, existe.fin) } : { ...v, bloque });
  };
  return (
    <div className="bg-campo/40 flex flex-col gap-2.5 rounded-2xl p-3">
      <div>
        <label className="etiqueta" htmlFor={`${id}-bloque`}>Bloque o semana (opcional)</label>
        <input id={`${id}-bloque`} value={v.bloque} onChange={(e) => cambiarNombre(e.target.value)} list={`${id}-lista`} className="campo" placeholder="Ej.: Semana 1, Fase de fuerza" maxLength={40} />
        <datalist id={`${id}-lista`}>
          {nombres.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="etiqueta" htmlFor={`${id}-inicio`}>Empieza</label>
          <input id={`${id}-inicio`} type="date" value={v.inicio} onChange={(e) => onChange({ ...v, inicio: e.target.value })} className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor={`${id}-semanas`}>Dura</label>
          <select id={`${id}-semanas`} value={v.semanas} onChange={(e) => onChange({ ...v, semanas: Number(e.target.value) })} className="campo" disabled={!v.inicio}>
            <option value={0}>Sin fecha de fin</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'semana' : 'semanas'}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-suave text-xs">
        {v.inicio
          ? `Tu cliente lo verá ${fin ? `del ${fechaCorta(v.inicio)} al ${fechaCorta(fin)}` : `desde el ${fechaCorta(v.inicio)}`}. Antes de esa fecha le aparece como “Próximo”.`
          : 'Sin fecha de inicio, la rutina se ve de inmediato y no vence.'}
      </p>
    </div>
  );
}

/**
 * Asigna una o varias rutinas (de una plantilla o copiadas de otro cliente) a uno o varios clientes.
 * Con `clienteFijo` no se muestra la lista de clientes (ej. duplicar un bloque en el mismo cliente).
 */
export function FormAsignar({
  rutinas,
  iniciales,
  clienteFijo,
  excluir,
  textoBoton = 'Asignar',
  onCancelar,
  onListo,
}: {
  rutinas: RutinaBase[];
  iniciales: ValoresBloque;
  clienteFijo?: string;
  excluir?: string;
  textoBoton?: string;
  onCancelar: () => void;
  onListo: (n: number) => void;
}) {
  const [clientes, setClientes] = useState<PerfilNube[]>();
  const [elegidos, setElegidos] = useState<Set<string>>(new Set(clienteFijo ? [clienteFijo] : []));
  const [bloque, setBloque] = useState(iniciales);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (clienteFijo) return;
    listarPerfiles()
      .then((ps) => setClientes(ps.filter((p) => p.estado === 'aceptado' && p.id !== excluir).sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)))))
      .catch((e) => setError(traducirError(e)));
  }, [clienteFijo, excluir]);

  const alternar = (id: string) =>
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await asignarRutinas([...elegidos], rutinas, {
        bloque: bloque.bloque.trim() || undefined,
        inicio: bloque.inicio || undefined,
        fin: finDe(bloque.inicio || undefined, bloque.semanas),
      });
      onListo(elegidos.size);
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div className="bg-campo/40 rounded-2xl p-3 text-sm">
        <p className="text-suave mb-1 text-xs font-semibold uppercase">{rutinas.length === 1 ? 'Rutina' : `${rutinas.length} rutinas`}</p>
        {rutinas.map((r, i) => (
          <p key={i}>
            {r.nombre}
            <span className="text-suave text-xs">
              {' '}
              · {r.dia ?? 'cualquier día'} · {r.ejercicios.length} ej.
            </span>
          </p>
        ))}
      </div>

      {!clienteFijo && (
        <div>
          <p className="etiqueta">¿A quién?</p>
          {clientes === undefined && !error && <p className="text-suave text-sm">Cargando clientes…</p>}
          {clientes?.length === 0 && <p className="text-suave text-sm">No tienes otros clientes aceptados.</p>}
          <ul className="flex flex-col gap-1">
            {clientes?.map((p) => (
              <li key={p.id}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-2.5 py-2 transition ${elegidos.has(p.id) ? 'border-dorado/50 bg-dorado/[0.07]' : 'bg-campo/40 border-transparent'}`}>
                  <input type="checkbox" checked={elegidos.has(p.id)} onChange={() => alternar(p.id)} className="sr-only" />
                  <Avatar p={p} tam="size-9" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nombreDe(p)}</span>
                  <span className={`grid size-6 place-items-center rounded-full border ${elegidos.has(p.id) ? 'bg-dorado border-dorado text-fondo' : 'border-white/20'}`}>
                    {elegidos.has(p.id) && <Icon name="check" size={14} strokeWidth={3} />}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CamposBloque v={bloque} onChange={setBloque} id="asignar" />

      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="btn-sec">
          Cancelar
        </button>
        <button className="btn-oro flex-1" disabled={guardando || !elegidos.size || !rutinas.length}>
          {guardando ? 'Guardando…' : !clienteFijo && elegidos.size > 1 ? `${textoBoton} a ${elegidos.size} clientes` : textoBoton}
        </button>
      </div>
    </form>
  );
}
