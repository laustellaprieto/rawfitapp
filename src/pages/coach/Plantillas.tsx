import { useCallback, useEffect, useState } from 'react';
import { borrarPlantilla, guardarPlantilla, listarPlantillas, type Plantilla, type RutinaBase } from '../../lib/coach';
import type { Rutina } from '../../lib/db';
import { traducirError } from '../../lib/nube';
import { textoObjetivo } from '../../lib/rutinas';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Vacio } from '../../components/ui';
import { FormAsignar, proximoLunes } from './Asignar';
import { EditorRutina } from './EditorRutina';

const resumen = (p: Plantilla) => `${p.rutinas.length} ${p.rutinas.length === 1 ? 'rutina' : 'rutinas'}${p.rutinas.some((r) => r.dia) ? ' · ' + p.rutinas.map((r) => r.dia?.slice(0, 3) ?? '—').join(', ') : ''}`;

function usePlantillas() {
  const [lista, setLista] = useState<Plantilla[]>();
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    try {
      setLista(await listarPlantillas());
      setError('');
    } catch (e) {
      setError(traducirError(e));
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);
  return { lista, error, cargar };
}

/** Pestaña "Plantillas" del panel de coach. */
export function Plantillas() {
  const { lista, error, cargar } = usePlantillas();
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [asignando, setAsignando] = useState<Plantilla | null>(null);
  const [aviso, setAviso] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-suave text-sm">Guarda una rutina o una semana completa y asígnala a tus clientes con un toque.</p>
        <button className="btn-oro shrink-0 !py-2.5" onClick={() => setEditando({ uid: crypto.randomUUID(), nombre: '', rutinas: [], creada: new Date().toISOString() })}>
          <Icon name="mas" size={18} strokeWidth={2.4} /> Plantilla
        </button>
      </div>
      {aviso && (
        <p role="status" className="animate-entrada bg-baja/10 text-baja rounded-xl px-3 py-2 text-sm">
          {aviso}
        </p>
      )}
      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}
      {lista === undefined && !error && <p className="text-suave py-6 text-center text-sm">Cargando…</p>}
      {lista?.length === 0 && (
        <Vacio
          icono="copiar"
          titulo="Sin plantillas"
          texto="Crea una aquí, o en la ficha de un cliente toca ⋯ sobre una rutina o un bloque y elige “Guardar como plantilla”."
        />
      )}
      {lista?.map((p) => (
        <div key={p.uid} className="tarjeta animate-entrada !p-3">
          <button onClick={() => setEditando(p)} className="block w-full text-left">
            <p className="font-semibold">{p.nombre}</p>
            <p className="text-suave text-xs">{resumen(p)}</p>
          </button>
          <div className="mt-2.5 flex gap-2">
            <button onClick={() => setEditando(p)} className="btn-sec flex-1 !py-2 text-xs">
              <Icon name="editar" size={15} /> Editar
            </button>
            <button onClick={() => setAsignando(p)} className="btn-oro flex-1 !py-2 text-xs" disabled={!p.rutinas.length}>
              <Icon name="usuarios" size={15} /> Asignar a clientes
            </button>
          </div>
        </div>
      ))}

      <Sheet formulario abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.nombre ? 'Editar plantilla' : 'Nueva plantilla'}>
        {editando && (
          <EditorPlantilla
            key={editando.uid}
            plantilla={editando}
            existe={!!lista?.some((p) => p.uid === editando.uid)}
            onCancelar={() => setEditando(null)}
            onListo={async () => {
              setEditando(null);
              await cargar();
            }}
          />
        )}
      </Sheet>

      <Sheet formulario abierto={!!asignando} onCerrar={() => setAsignando(null)} titulo="Asignar plantilla">
        {asignando && (
          <FormAsignar
            rutinas={asignando.rutinas}
            iniciales={{ bloque: asignando.nombre, inicio: proximoLunes(), semanas: 1 }}
            onCancelar={() => setAsignando(null)}
            onListo={(n) => {
              setAviso(`Listo: “${asignando.nombre}” se asignó a ${n} ${n === 1 ? 'cliente' : 'clientes'}.`);
              setAsignando(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function EditorPlantilla({ plantilla, existe, onCancelar, onListo }: { plantilla: Plantilla; existe: boolean; onCancelar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [rutinas, setRutinas] = useState<RutinaBase[]>(plantilla.rutinas);
  const [editando, setEditando] = useState<{ i: number; r: Rutina } | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const ejecutar = async (fn: () => Promise<void>) => {
    setGuardando(true);
    setError('');
    try {
      await fn();
      onListo();
    } catch (e) {
      setError(traducirError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => guardarPlantilla({ ...plantilla, nombre: nombre.trim(), rutinas }));
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="etiqueta" htmlFor="p-nombre">Nombre de la plantilla</label>
          <input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" placeholder="Ej.: Fuerza 3 días – principiante" maxLength={50} required />
        </div>

        <div className="flex flex-col gap-2">
          {rutinas.map((r, i) => (
            <div key={i} className="bg-campo/50 flex items-start gap-2 rounded-2xl p-3">
              <button type="button" onClick={() => setEditando({ i, r: { ...r, orden: i } })} className="min-w-0 flex-1 text-left">
                <p className="font-semibold">
                  {r.nombre} <span className="text-suave text-xs font-normal">· {r.dia ?? 'cualquier día'}</span>
                </p>
                <ul className="mt-1 text-xs">
                  {r.ejercicios.map((e, j) => (
                    <li key={j}>
                      {e.nombre} <span className="text-champagne">{textoObjetivo(e)}</span>
                    </li>
                  ))}
                </ul>
              </button>
              <button type="button" onClick={() => setRutinas((rs) => rs.filter((_, j) => j !== i))} className="text-suave hover:text-sube p-1" aria-label={`Quitar ${r.nombre}`}>
                <Icon name="basura" size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setEditando({ i: rutinas.length, r: { nombre: '', orden: rutinas.length, ejercicios: [] } })} className="btn-sec w-full border border-dashed border-white/10">
            <Icon name="mas" size={18} /> Agregar rutina
          </button>
        </div>

        {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}

        <div className="flex gap-2">
          {existe && (
            <button
              type="button"
              onClick={() => confirm('¿Borrar esta plantilla? Las rutinas que ya asignaste a tus clientes no cambian.') && ejecutar(() => borrarPlantilla(plantilla.uid))}
              className="btn-peligro"
              aria-label="Borrar plantilla"
            >
              <Icon name="basura" size={18} />
            </button>
          )}
          <button type="button" onClick={onCancelar} className="btn-sec">
            Cancelar
          </button>
          <button className="btn-oro flex-1" disabled={guardando || !nombre.trim() || !rutinas.length}>
            {guardando ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </form>

      <Sheet formulario abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.r.nombre ? 'Editar rutina' : 'Nueva rutina'}>
        {editando && (
          <EditorRutina
            rutina={editando.r}
            textoGuardar="Listo"
            onCancelar={() => setEditando(null)}
            onGuardar={async (r) => {
              const { orden: _o, ...base } = r;
              void _o;
              setRutinas((rs) => {
                const n = [...rs];
                n[editando.i] = base;
                return n;
              });
              setEditando(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/** Lista de plantillas para elegir una (ej. "Desde plantilla" en la ficha de un cliente). */
export function ElegirPlantilla({ onElegir }: { onElegir: (p: Plantilla) => void }) {
  const { lista, error } = usePlantillas();
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}
      {lista === undefined && !error && <p className="text-suave py-6 text-center text-sm">Cargando…</p>}
      {lista?.length === 0 && <p className="text-suave py-4 text-center text-sm">Aún no tienes plantillas. Créalas en el panel de coach → Plantillas.</p>}
      {lista
        ?.filter((p) => p.rutinas.length)
        .map((p) => (
          <button key={p.uid} onClick={() => onElegir(p)} className="bg-campo/50 hover:bg-campo flex items-center gap-3 rounded-2xl p-3 text-left transition">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.nombre}</span>
              <span className="text-suave block text-xs">{resumen(p)}</span>
            </span>
            <Icon name="der" size={18} className="text-dorado" />
          </button>
        ))}
    </div>
  );
}
