import { useMemo, useState } from 'react';
import { GRUPOS, type EjercicioBanco } from '../../data/ejercicios';
import { useBanco } from '../../lib/entreno';
import { buscarEjercicios } from '../../lib/busqueda';
import { Icon } from '../../components/Icon';
import { Segmentos } from '../../components/ui';

/** Buscador del banco de ejercicios para agregarlos a una sesión. */
export function Buscador({ onElegir }: { onElegir: (e: EjercicioBanco) => void }) {
  const banco = useBanco();
  const [q, setQ] = useState('');
  const [grupo, setGrupo] = useState<string>('Todos');

  const resultados = useMemo(() => {
    return buscarEjercicios(banco, q).filter((e) => grupo === 'Todos' || e.grupo === grupo);
  }, [banco, q, grupo]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Icon name="buscar" size={18} className="text-suave pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="campo !pl-10" placeholder="Buscar: sentadilla, remo, plancha…" aria-label="Buscar ejercicio" />
      </div>
      <Segmentos opciones={['Todos', ...GRUPOS].map((g) => ({ valor: g, texto: g }))} valor={grupo} onChange={setGrupo} />
      <ul className="-mx-1 flex max-h-[50dvh] flex-col overflow-y-auto">
        {resultados.map((e) => (
          <li key={e.id}>
            <button onClick={() => onElegir(e)} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/5 active:bg-white/10">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{e.nombre}</span>
                <span className="text-suave block text-xs">
                  {e.grupo} · {e.equipo}
                </span>
              </span>
              <Icon name="mas" size={18} className="text-dorado shrink-0" />
            </button>
          </li>
        ))}
        {resultados.length === 0 && <li className="text-suave py-6 text-center text-sm">No encontramos ese ejercicio. Puedes agregarlo en la pestaña Ejercicios.</li>}
      </ul>
    </div>
  );
}
