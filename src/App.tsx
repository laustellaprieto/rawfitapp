import { useEffect, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { PiePagina } from './components/ui';
import Ajustes from './pages/Ajustes';
import Entrenos from './pages/Entrenos';
import Fotos from './pages/Fotos';
import Habitos from './pages/Habitos';
import Inicio from './pages/Inicio';
import Medidas from './pages/Medidas';

export type Pagina = 'inicio' | 'habitos' | 'medidas' | 'fotos' | 'entrenos' | 'ajustes';

const NAV: { id: Pagina; texto: string; icono: IconName }[] = [
  { id: 'inicio', texto: 'Inicio', icono: 'inicio' },
  { id: 'habitos', texto: 'Hábitos', icono: 'habitos' },
  { id: 'medidas', texto: 'Medidas', icono: 'medidas' },
  { id: 'fotos', texto: 'Fotos', icono: 'fotos' },
  { id: 'entrenos', texto: 'Entrenos', icono: 'entrenos' },
];

const leerHash = (): Pagina => {
  const h = window.location.hash.slice(1) as Pagina;
  return [...NAV.map((n) => n.id), 'ajustes'].includes(h) ? h : 'inicio';
};

export default function App() {
  const [pagina, setPagina] = useState<Pagina>(leerHash);

  useEffect(() => {
    const f = () => setPagina(leerHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  useEffect(() => window.scrollTo({ top: 0 }), [pagina]);

  const ir = (p: Pagina) => {
    window.location.hash = p === 'inicio' ? '' : p;
    setPagina(p);
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      {/* Barra superior */}
      <div className="bg-fondo/85 sticky top-0 z-30 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-md sm:px-6">
        <button onClick={() => ir('inicio')} className="flex items-baseline gap-2">
          <span className="titulo text-dorado text-2xl leading-none">RAWFIT</span>
          <span className="text-suave text-[10px] font-medium tracking-[0.25em] uppercase">Kit de seguimiento</span>
        </button>
        <button
          onClick={() => ir('ajustes')}
          className={`rounded-full p-2 transition ${pagina === 'ajustes' ? 'text-dorado bg-dorado/10' : 'text-suave hover:text-texto'}`}
          aria-label="Ajustes"
        >
          <Icon name="ajustes" size={20} />
        </button>
      </div>

      <main key={pagina} className="pb-segura px-4 pt-2 sm:px-6">
        {pagina === 'inicio' && <Inicio ir={ir} />}
        {pagina === 'habitos' && <Habitos />}
        {pagina === 'medidas' && <Medidas />}
        {pagina === 'fotos' && <Fotos />}
        {pagina === 'entrenos' && <Entrenos />}
        {pagina === 'ajustes' && <Ajustes />}
        <PiePagina />
      </main>

      {/* Navegación inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-4">
        <div className="bg-tarjeta/90 mx-auto grid max-w-md grid-cols-5 rounded-3xl border border-white/[0.06] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {NAV.map((n) => {
            const activo = pagina === n.id;
            return (
              <button
                key={n.id}
                onClick={() => ir(n.id)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 transition ${activo ? 'bg-dorado/12 text-dorado' : 'text-suave hover:text-texto'}`}
                aria-current={activo ? 'page' : undefined}
              >
                <Icon name={n.icono} size={21} strokeWidth={activo ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold">{n.texto}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
