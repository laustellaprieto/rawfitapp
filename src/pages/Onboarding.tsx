import { useState } from 'react';
import { guardarPerfil, type Perfil } from '../lib/db';
import { hoyISO } from '../lib/fechas';
import { parseNum } from '../lib/format';
import { useHabitos } from '../lib/hooks';
import { EditorHabitos } from '../components/EditorHabitos';
import { Icon } from '../components/Icon';
import { PiePagina } from '../components/ui';

export default function Onboarding({ perfil }: { perfil: Perfil }) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState(perfil.nombre);
  const [fechaInicio, setFechaInicio] = useState(perfil.fechaInicio || hoyISO());
  const [estatura, setEstatura] = useState(perfil.estatura?.toString() ?? '');
  const [objetivo, setObjetivo] = useState(perfil.objetivo);
  const { todos } = useHabitos();

  const est = parseNum(estatura);
  const estaturaValida = est === undefined || (est >= 100 && est <= 250);
  const puedeSeguir = [nombre.trim() && fechaInicio, estaturaValida, todos.some((h) => h.activo)][paso];

  const terminar = () =>
    guardarPerfil({ nombre: nombre.trim(), fechaInicio, estatura: est, objetivo: objetivo.trim(), onboardingCompleto: true });

  const siguiente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeSeguir) return;
    if (paso < 2) setPaso(paso + 1);
    else terminar();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="mb-8 flex items-center justify-between">
        <span className="titulo text-dorado text-2xl">RAWFIT</span>
        <div className="flex gap-1.5" aria-label={`Paso ${paso + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === paso ? 'bg-dorado w-6' : i < paso ? 'bg-dorado/60 w-1.5' : 'w-1.5 bg-[#333]'}`} />
          ))}
        </div>
      </div>

      <form key={paso} onSubmit={siguiente} className="animate-entrada flex flex-1 flex-col">
        {paso === 0 && (
          <>
            <p className="text-suave text-xs font-medium tracking-[0.2em] uppercase">Kit de seguimiento</p>
            <h1 className="titulo mt-1 text-5xl leading-none">Te damos la bienvenida</h1>
            <p className="text-suave mt-3 mb-8">Aquí vas a registrar tus hábitos, medidas, fotos y entrenos. Todo se guarda solo en tu celular.</p>
            <label className="etiqueta" htmlFor="o-nombre">¿Cómo te llamas?</label>
            <input id="o-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo mb-5" placeholder="Tu nombre" maxLength={30} autoComplete="given-name" />
            <label className="etiqueta" htmlFor="o-fecha">Fecha de inicio del reto</label>
            <input id="o-fecha" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="campo" required />
            <p className="text-suave mt-2 text-xs">Ese día será tu “Día 1”. Normalmente es hoy.</p>
          </>
        )}

        {paso === 1 && (
          <>
            <h1 className="titulo text-5xl leading-none">Sobre ti</h1>
            <p className="text-suave mt-3 mb-8">Tu estatura sirve para calcular la relación cintura/estatura. Tu objetivo te lo recordaremos cada día.</p>
            <label className="etiqueta" htmlFor="o-est">Estatura (cm)</label>
            <input id="o-est" inputMode="decimal" value={estatura} onChange={(e) => setEstatura(e.target.value)} className="campo mb-1" placeholder="Ej.: 165" />
            {!estaturaValida && <p className="text-sube mb-2 text-xs">Escribe tu estatura en centímetros (entre 100 y 250).</p>}
            <div className="mb-5" />
            <label className="etiqueta" htmlFor="o-obj">Tu objetivo</label>
            <textarea
              id="o-obj"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              className="campo min-h-24 resize-none"
              placeholder="Ej.: Ganar fuerza, bajar 5 cm de cintura y sentirme con más energía"
              maxLength={160}
            />
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="titulo text-5xl leading-none">Tus hábitos</h1>
            <p className="text-suave mt-3 mb-6">Estos son los 10 hábitos del kit. Cámbialos, quita o agrega los que quieras. Después puedes editarlos en Ajustes.</p>
            <EditorHabitos habitos={todos} />
          </>
        )}

        <div className="mt-auto flex gap-2 pt-8">
          {paso > 0 && (
            <button type="button" onClick={() => setPaso(paso - 1)} className="btn-sec !px-4" aria-label="Atrás">
              <Icon name="izq" size={20} />
            </button>
          )}
          <button className="btn-oro flex-1 !py-3.5" disabled={!puedeSeguir}>
            {paso < 2 ? 'Continuar' : '¡Empezar mi reto!'}
          </button>
        </div>
      </form>
      <PiePagina />
    </div>
  );
}
