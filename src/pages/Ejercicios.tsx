import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { EQUIPOS, GRUPOS, NIVELES, type EjercicioBanco } from '../data/ejercicios';
import { db, type EjercicioPropio } from '../lib/db';
import { calcularRecords, useBanco } from '../lib/entreno';
import { num } from '../lib/format';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { BotonAgregar, Encabezado } from '../components/ui';
import { normalizar } from './entreno/Buscador';

const TODOS = 'Todos';
const COLOR_NIVEL: Record<string, string> = {
  Principiante: 'text-baja bg-baja/10',
  Intermedio: 'text-dorado bg-dorado/10',
  Avanzado: 'text-sube bg-sube/10',
};

export default function Ejercicios() {
  const banco = useBanco();
  const sesiones = useLiveQuery(() => db.sesiones.toArray(), []);
  const records = useMemo(() => new Map(calcularRecords(sesiones ?? []).map((r) => [r.ejercicioId, r])), [sesiones]);
  const [q, setQ] = useState('');
  const [grupo, setGrupo] = useState(TODOS);
  const [nivel, setNivel] = useState(TODOS);
  const [equipo, setEquipo] = useState(TODOS);
  const [editando, setEditando] = useState<EjercicioPropio | null>(null);

  const filtrados = useMemo(() => {
    const nq = normalizar(q.trim());
    return banco.filter(
      (e) =>
        (grupo === TODOS || e.grupo === grupo) &&
        (nivel === TODOS || e.nivel === nivel) &&
        (equipo === TODOS || e.equipo === equipo) &&
        (!nq || normalizar(`${e.nombre} ${e.grupo} ${e.equipo}`).includes(nq)),
    );
  }, [banco, q, grupo, nivel, equipo]);

  const porGrupo = useMemo(() => {
    const orden = [...GRUPOS, ...new Set(banco.map((e) => e.grupo).filter((g) => !(GRUPOS as readonly string[]).includes(g)))];
    return orden.map((g) => [g, filtrados.filter((e) => e.grupo === g)] as const).filter(([, l]) => l.length);
  }, [filtrados, banco]);

  const hayFiltros = q || grupo !== TODOS || nivel !== TODOS || equipo !== TODOS;

  return (
    <>
      <Encabezado
        subtitulo={`${banco.length} ejercicios`}
        titulo="Ejercicios"
        accion={<BotonAgregar onClick={() => setEditando({ nombre: '', grupo: GRUPOS[0], equipo: EQUIPOS[0], nivel: NIVELES[0] })}>Agregar</BotonAgregar>}
      />

      <div className="animate-entrada bg-fondo/90 sticky top-[calc(env(safe-area-inset-top)+3.6rem)] z-20 -mx-4 mb-4 flex flex-col gap-2.5 px-4 pt-1 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="relative">
          <Icon name="buscar" size={18} className="text-suave pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="campo !pl-10" placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" type="search" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Filtro etiqueta="Grupo" valor={grupo} opciones={[...new Set([...GRUPOS, ...banco.map((e) => e.grupo)])]} onChange={setGrupo} />
          <Filtro etiqueta="Nivel" valor={nivel} opciones={[...NIVELES]} onChange={setNivel} />
          <Filtro etiqueta="Equipo" valor={equipo} opciones={[...new Set([...EQUIPOS, ...banco.map((e) => e.equipo)])]} onChange={setEquipo} />
        </div>
        {hayFiltros && (
          <div className="text-suave flex items-center justify-between text-xs">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'}
            </span>
            <button
              className="text-dorado font-semibold"
              onClick={() => {
                setQ('');
                setGrupo(TODOS);
                setNivel(TODOS);
                setEquipo(TODOS);
              }}
            >
              Quitar filtros
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {porGrupo.map(([g, lista]) => (
          <section key={g} className="animate-entrada">
            <h2 className="titulo text-champagne mb-2 text-xl">
              {g} <span className="text-suave font-sans text-xs font-medium">{lista.length}</span>
            </h2>
            <ul className="tarjeta !p-1.5">
              {lista.map((e) => (
                <Fila key={e.id} e={e} record={records.get(e.id)?.pesoMax} onEditar={e.id.startsWith('propio-') ? () => abrirPropio(e) : undefined} />
              ))}
            </ul>
          </section>
        ))}
        {porGrupo.length === 0 && <p className="tarjeta text-suave py-8 text-center text-sm">No hay ejercicios con esos filtros.</p>}
      </div>

      <Sheet abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
        {editando && <FormPropio key={editando.id ?? 'nuevo'} ejercicio={editando} onCerrar={() => setEditando(null)} />}
      </Sheet>
    </>
  );

  function abrirPropio(e: EjercicioBanco) {
    db.ejerciciosPropios.get(Number(e.id.replace('propio-', ''))).then((p) => p && setEditando(p));
  }
}

function Filtro({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: string; opciones: string[]; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <span className="sr-only">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`campo appearance-none !rounded-xl !py-2.5 !pr-7 !pl-3 !text-sm ${valor !== TODOS ? '!border-dorado/50 text-champagne' : 'text-suave'}`}
      >
        <option value={TODOS}>{etiqueta}</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Icon name="abajo" size={14} className="text-suave pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2" />
    </label>
  );
}

function Fila({ e, record, onEditar }: { e: EjercicioBanco; record?: number; onEditar?: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{e.nombre}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="bg-campo text-suave rounded-full px-2 py-0.5 text-[10px] font-semibold">{e.equipo}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLOR_NIVEL[e.nivel] ?? 'bg-campo text-suave'}`}>{e.nivel}</span>
          {onEditar && <span className="text-champagne bg-champagne/10 rounded-full px-2 py-0.5 text-[10px] font-semibold">Propio</span>}
        </div>
      </div>
      {record ? (
        <div className="shrink-0 text-right">
          <p className="titulo text-champagne text-xl leading-none">{num(record)}</p>
          <p className="text-suave text-[9px]">kg récord</p>
        </div>
      ) : null}
      {onEditar && (
        <button onClick={onEditar} className="text-suave hover:text-texto shrink-0 p-1.5" aria-label={`Editar ${e.nombre}`}>
          <Icon name="editar" size={16} />
        </button>
      )}
    </li>
  );
}

function FormPropio({ ejercicio, onCerrar }: { ejercicio: EjercicioPropio; onCerrar: () => void }) {
  const [datos, setDatos] = useState(ejercicio);
  const set = (k: keyof EjercicioPropio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDatos((d) => ({ ...d, [k]: e.target.value }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = { ...datos, nombre: datos.nombre.trim() };
    if (ejercicio.id) await db.ejerciciosPropios.put(limpio);
    else await db.ejerciciosPropios.add(limpio);
    onCerrar();
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar "${ejercicio.nombre}" del banco? Tus sesiones guardadas no se borran.`)) return;
    await db.ejerciciosPropios.delete(ejercicio.id!);
    onCerrar();
  };

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        <label className="etiqueta" htmlFor="ep-nombre">Nombre</label>
        <input id="ep-nombre" autoFocus value={datos.nombre} onChange={set('nombre')} className="campo" placeholder="Ej.: Sentadilla con pausa" maxLength={60} required />
      </div>
      <div>
        <label className="etiqueta" htmlFor="ep-grupo">Grupo muscular</label>
        <select id="ep-grupo" value={datos.grupo} onChange={set('grupo')} className="campo">
          {GRUPOS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="ep-equipo">Equipo</label>
          <select id="ep-equipo" value={datos.equipo} onChange={set('equipo')} className="campo">
            {EQUIPOS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="ep-nivel">Nivel</label>
          <select id="ep-nivel" value={datos.nivel} onChange={set('nivel')} className="campo">
            {NIVELES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        {ejercicio.id && (
          <button type="button" onClick={eliminar} className="btn-peligro" aria-label="Eliminar ejercicio">
            <Icon name="basura" size={18} />
          </button>
        )}
        <button className="btn-oro flex-1" disabled={!datos.nombre.trim()}>
          Guardar ejercicio
        </button>
      </div>
    </form>
  );
}
