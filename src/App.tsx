import { useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import { Celebracion } from './components/Celebracion';
import { Icon, type IconName } from './components/Icon';
import { PiePagina } from './components/ui';
import { useCelebracion } from './lib/celebraciones';
import { usePerfil } from './lib/hooks';
import { useCuenta } from './lib/nube';
import { DialogosCuenta } from './components/Cuenta';
import PanelCoach from './pages/coach/PanelCoach';
import Ajustes from './pages/Ajustes';
import Habitos from './pages/Habitos';
import Hoy from './pages/Hoy';
import Onboarding from './pages/Onboarding';
import Ejercicios from './pages/Ejercicios';
import Progreso from './pages/progreso/Progreso';
import Entreno from './pages/entreno/Entreno';

export type Pagina = 'hoy' | 'habitos' | 'progreso' | 'entreno' | 'ejercicios' | 'ajustes' | 'coach';
/** Navega a una pestaña; `accion` abre algo dentro (ej. el formulario de medición). */
export type Ir = (p: Pagina, accion?: string) => void;

const NAV: { id: Pagina; texto: string; icono: IconName }[] = [
  { id: 'hoy', texto: 'Hoy', icono: 'inicio' },
  { id: 'habitos', texto: 'Hábitos', icono: 'habitos' },
  { id: 'progreso', texto: 'Progreso', icono: 'medidas' },
  { id: 'entreno', texto: 'Entreno', icono: 'entrenos' },
  { id: 'ejercicios', texto: 'Ejercicios', icono: 'lista' },
];
const PAGINAS: Pagina[] = [...NAV.map((n) => n.id), 'ajustes', 'coach'];

const leerHash = (): Pagina => {
  const h = window.location.hash.slice(1) as Pagina;
  return PAGINAS.includes(h) ? h : 'hoy';
};

export default function App() {
  const perfil = usePerfil();
  const [pagina, setPagina] = useState<Pagina>(leerHash);
  const [accion, setAccion] = useState<string>();
  const listo = !!perfil?.onboardingCompleto;
  const celebracion = useCelebracion(listo);
  const cuenta = useCuenta();
  const esCoach = cuenta.perfil?.rol === 'coach';

  useEffect(() => {
    const f = () => {
      setPagina(leerHash());
      setAccion(undefined);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  useEffect(() => window.scrollTo({ top: 0 }), [pagina]);

  const ir: Ir = (p, a) => {
    setAccion(a);
    setPagina(p);
    const hash = p === 'hoy' ? '' : `#${p}`;
    if (window.location.hash !== hash) history.pushState(null, '', hash || window.location.pathname);
  };

  if (!perfil) return null; // cargando
  if (!perfil.onboardingCompleto)
    return (
      <>
        <Onboarding perfil={perfil} />
        <DialogosCuenta />
      </>
    );

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <div className="bg-fondo/85 sticky top-0 z-30 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-md sm:px-6">
        <button onClick={() => ir('hoy')} className="flex items-center gap-2" aria-label="RawFit App, ir a Hoy">
          <img src={logo} alt="" className="h-7 w-auto" />
          <span className="titulo text-dorado text-2xl leading-none">RAWFIT</span>
        </button>
        <div className="flex items-center gap-1">
        {esCoach && (
          <button
            onClick={() => ir('coach')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${pagina === 'coach' ? 'bg-dorado text-fondo' : 'bg-dorado/12 text-dorado'}`}
          >
            <Icon name="usuarios" size={16} /> Coach
          </button>
        )}
        <button
          onClick={() => ir('ajustes')}
          className={`rounded-full p-2 transition ${pagina === 'ajustes' ? 'text-dorado bg-dorado/10' : 'text-suave hover:text-texto'}`}
          aria-label="Ajustes"
        >
          <Icon name="ajustes" size={20} />
        </button>
        </div>
      </div>

      <main key={pagina} className="pb-segura px-4 pt-2 sm:px-6">
        {pagina === 'hoy' && <Hoy perfil={perfil} ir={ir} />}
        {pagina === 'habitos' && <Habitos ir={ir} />}
        {pagina === 'progreso' && <Progreso perfil={perfil} accion={accion} />}
        {pagina === 'entreno' && <Entreno accion={accion} />}
        {pagina === 'ejercicios' && <Ejercicios />}
        {pagina === 'ajustes' && <Ajustes perfil={perfil} ir={ir} />}
        {pagina === 'coach' && (esCoach ? <PanelCoach /> : <Hoy perfil={perfil} ir={ir} />)}
        <PiePagina />
      </main>

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

      {celebracion.hito && <Celebracion hito={celebracion.hito} onCerrar={celebracion.cerrar} />}
      <DialogosCuenta />
    </div>
  );
}
