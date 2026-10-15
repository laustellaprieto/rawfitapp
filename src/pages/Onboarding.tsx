import { useEffect, useRef, useState } from 'react';
import { importarCopia } from '../lib/copia';
import logo from '../../assets/logo-app.png';
import { calcularMacros, valido } from '../lib/calorias';
import { db, guardarPerfil, type Perfil, type Sexo } from '../lib/db';
import { hoyISO } from '../lib/fechas';
import { numTxt, parseNum } from '../lib/format';
import { useHabitos } from '../lib/hooks';
import { Macros, ResultadoCaloriasTarjeta, resultadoDe, SelectorMeta, type DatosCaloriasTxt } from '../components/Calorias';
import { EditorHabitos } from '../components/EditorHabitos';
import { Icon } from '../components/Icon';
import { PiePagina } from '../components/ui';
import { HojaAcceso } from '../components/Cuenta';
import { reintentarVinculo, useCuenta } from '../lib/nube';
import { nubeConfigurada } from '../config';

const PASOS = 4;

export default function Onboarding({ perfil }: { perfil: Perfil }) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState(perfil.nombre);
  const [fechaInicio, setFechaInicio] = useState(perfil.fechaInicio || hoyISO());
  const [objetivo, setObjetivo] = useState(perfil.objetivo);
  const [cal, setCal] = useState<DatosCaloriasTxt>({
    sexo: perfil.sexo,
    edad: numTxt(perfil.edad),
    peso: numTxt(perfil.peso),
    estatura: numTxt(perfil.estatura),
    actividad: perfil.actividad ?? 'ligera',
    meta: perfil.meta ?? 'mantenimiento',
    porcentaje: perfil.porcentaje ?? 0,
    proteinaGkg: perfil.proteinaGkg,
    grasaPct: perfil.grasaPct,
  });
  const { todos } = useHabitos();
  const [acceso, setAcceso] = useState(false);
  // Si inicia sesión o crea su cuenta aquí y la cuenta es nueva, sigue el onboarding (con su sesión ya abierta).
  const cuenta = useCuenta();
  const conSesion = !!cuenta.sesion;
  const nombreCuenta = cuenta.perfil?.nombre || (cuenta.sesion?.user.user_metadata?.nombre as string | undefined) || '';
  useEffect(() => {
    if (nombreCuenta) setNombre((n) => n || nombreCuenta);
  }, [nombreCuenta]);
  const archivo = useRef<HTMLInputElement>(null);
  const [errorImportar, setErrorImportar] = useState('');
  const cambiar = (d: Partial<DatosCaloriasTxt>) => setCal((c) => ({ ...c, ...d }));

  const edad = parseNum(cal.edad);
  const peso = parseNum(cal.peso);
  const estatura = parseNum(cal.estatura);
  const datosValidos = !!cal.sexo && valido.edad(edad) && valido.peso(peso) && valido.estatura(estatura);
  const resultado = resultadoDe(cal, parseNum);
  const macros = resultado && peso ? calcularMacros(resultado.objetivo, peso, resultado.meta, cal.proteinaGkg, cal.grasaPct) : undefined;
  const puedeSeguir = [!!(nombre.trim() && fechaInicio), datosValidos, !!resultado, todos.some((h) => h.activo)][paso];

  const terminar = async () => {
    await guardarPerfil({
      nombre: nombre.trim(),
      fechaInicio,
      objetivo: objetivo.trim(),
      sexo: cal.sexo,
      edad,
      peso,
      estatura,
      actividad: cal.actividad,
      meta: cal.meta,
      porcentaje: cal.porcentaje,
      proteinaGkg: macros?.proteinaGkg,
      grasaPct: macros?.grasaPct,
      onboardingCompleto: true,
    });
    // El peso inicial queda también como primera medición.
    if (peso && (await db.mediciones.count()) === 0) await db.mediciones.add({ fecha: hoyISO(), peso });
  };

  const siguiente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeSeguir) return;
    if (paso < PASOS - 1) setPaso(paso + 1);
    else terminar();
  };

  const error = (ok: boolean, txt: string, valor: string) => (!ok && valor.trim() ? <p className="text-sube mt-1 text-xs">{txt}</p> : null);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="mb-8 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <img src={logo} alt="" className="h-7 w-auto" />
          <span className="titulo text-dorado text-2xl">RAWFIT</span>
        </span>
        <div className="flex gap-1.5" aria-label={`Paso ${paso + 1} de ${PASOS}`}>
          {Array.from({ length: PASOS }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === paso ? 'bg-dorado w-6' : i < paso ? 'bg-dorado/60 w-1.5' : 'w-1.5 bg-[#333]'}`} />
          ))}
        </div>
      </div>

      <form key={paso} onSubmit={siguiente} className="animate-entrada flex flex-1 flex-col">
        {paso === 0 && (
          <>
            <p className="text-suave text-xs font-medium tracking-[0.2em] uppercase">RawFit App</p>
            <h1 className="titulo mt-1 text-5xl leading-none">Te damos la bienvenida</h1>
            <p className="text-suave mt-3 mb-6">Aquí registras tus hábitos, medidas, fotos y entrenos, y ves el plan que te prepara tu coach.</p>
            {conSesion && cuenta.vinculando && (
              <div className="bg-campo/60 mb-6 flex items-center gap-3 rounded-2xl p-4" role="status">
                <span className="border-dorado size-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-sm">Cargando tu cuenta…</p>
              </div>
            )}
            {conSesion && !cuenta.vinculando && (
              <div className="border-baja/30 bg-baja/[0.07] mb-6 rounded-2xl border p-4" role="status">
                <p className="text-baja flex items-center gap-1.5 font-semibold">
                  <Icon name="check" size={18} strokeWidth={2.6} /> Sesión iniciada
                </p>
                <p className="text-suave mt-0.5 truncate text-xs">{cuenta.sesion?.user.email}</p>
                {cuenta.sync === 'error' || cuenta.sync === 'sin-conexion' ? (
                  <p className="mt-2 text-sm">
                    No pudimos revisar tu cuenta.{' '}
                    <button type="button" onClick={() => reintentarVinculo()} className="text-dorado font-semibold underline">
                      Reintentar
                    </button>
                  </p>
                ) : (
                  <p className="mt-2 text-sm">Tu cuenta está lista. Completa estos datos para empezar tu reto: se guardan en tu cuenta.</p>
                )}
              </div>
            )}
            {nubeConfigurada && !conSesion && (
              <>
                <div className="border-dorado/30 bg-dorado/[0.07] rounded-2xl border p-4">
                  <p className="font-semibold">¿Tienes coach o ya tienes cuenta?</p>
                  <p className="text-suave mt-0.5 text-sm">Inicia sesión para recuperar tu progreso y recibir tu plan de entrenamiento.</p>
                  <button type="button" onClick={() => setAcceso(true)} className="btn-oro mt-3 w-full !py-3.5">
                    Inicia sesión
                  </button>
                  <p className="text-suave mt-2 text-center text-xs">¿Primera vez? Ahí mismo puedes crear tu cuenta.</p>
                </div>
                <p className="text-suave my-6 flex items-center gap-3 text-xs tracking-wider uppercase before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
                  o empieza sin cuenta
                </p>
              </>
            )}
            <label className="etiqueta" htmlFor="o-nombre">¿Cómo te llamas?</label>
            <input id="o-nombre" autoFocus={!nubeConfigurada} value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo mb-5" placeholder="Tu nombre" maxLength={30} autoComplete="given-name" />
            <label className="etiqueta" htmlFor="o-fecha">Fecha de inicio del reto</label>
            <input id="o-fecha" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="campo" required />
            <p className="text-suave mt-2 text-xs">Ese día será tu “Día 1”. Normalmente es hoy.</p>
            <div className="bg-campo/50 mt-6 rounded-2xl px-4 py-3 text-xs leading-relaxed">
              <p className="text-texto mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <Icon name="escudo" size={16} className="text-dorado" /> ¿Dónde se guardan tus datos?
              </p>
              <p className="text-suave">
                <b className="text-texto">Sin cuenta:</b> todo queda solo en este celular. Si lo cambias o borras la app, se pierde (salvo que exportes una copia en Ajustes).
              </p>
              {nubeConfigurada && (
                <p className="text-suave mt-1">
                  <b className="text-texto">Con cuenta:</b> tus hábitos, medidas, entrenos y diario de comidas también se guardan en la nube, así los recuperas en otro celular y tu coach puede ver tu progreso. Tu coach solo ve tus fotos si decides compartirlas.
                </p>
              )}
            </div>
            <input
              ref={archivo}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setErrorImportar('');
                try {
                  await importarCopia(f);
                } catch (err) {
                  setErrorImportar((err as Error).message);
                } finally {
                  e.target.value = '';
                }
              }}
            />
            {errorImportar && <p className="text-sube mt-2 text-xs">{errorImportar}</p>}
          </>
        )}

        {paso === 1 && (
          <>
            <h1 className="titulo text-5xl leading-none">Sobre ti</h1>
            <p className="text-suave mt-3 mb-6">Con estos datos calculamos tus calorías y la relación cintura/estatura.</p>

            <span className="etiqueta">Sexo (solo para el cálculo)</span>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(['mujer', 'hombre'] as Sexo[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => cambiar({ sexo: s })}
                  aria-pressed={cal.sexo === s}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${cal.sexo === s ? 'border-dorado bg-dorado/12 text-champagne' : 'bg-campo border-transparent'}`}
                >
                  {s === 'mujer' ? 'Mujer' : 'Hombre'}
                </button>
              ))}
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div>
                <label className="etiqueta" htmlFor="o-edad">Edad</label>
                <input id="o-edad" inputMode="numeric" value={cal.edad} onChange={(e) => cambiar({ edad: e.target.value })} className="campo text-center" placeholder="años" />
              </div>
              <div>
                <label className="etiqueta" htmlFor="o-est">Estatura</label>
                <input id="o-est" inputMode="decimal" value={cal.estatura} onChange={(e) => cambiar({ estatura: e.target.value })} className="campo text-center" placeholder="cm" />
              </div>
              <div>
                <label className="etiqueta" htmlFor="o-peso">Peso</label>
                <input id="o-peso" inputMode="decimal" value={cal.peso} onChange={(e) => cambiar({ peso: e.target.value })} className="campo text-center" placeholder="kg" />
              </div>
            </div>
            {error(valido.edad(edad), 'La edad debe estar entre 14 y 100 años.', cal.edad)}
            {error(valido.estatura(estatura), 'Escribe tu estatura en centímetros (entre 100 y 250).', cal.estatura)}
            {error(valido.peso(peso), 'Escribe tu peso en kilos (entre 30 y 300).', cal.peso)}

            <label className="etiqueta mt-4" htmlFor="o-obj">Tu objetivo (opcional)</label>
            <textarea
              id="o-obj"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              className="campo min-h-20 resize-none"
              placeholder="Ej.: Ganar fuerza, bajar 5 cm de cintura y sentirme con más energía"
              maxLength={160}
            />
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="titulo text-5xl leading-none">Tus calorías</h1>
            <p className="text-suave mt-3 mb-6">Elige tu nivel de actividad y tu meta. Abajo verás tus calorías y tus macros. Lo puedes cambiar cuando quieras en Ajustes.</p>
            <SelectorMeta datos={cal} onChange={cambiar} />
            {resultado && (
              <div className="mt-6 flex flex-col gap-4">
                <ResultadoCaloriasTarjeta r={resultado} />
                {macros && <Macros m={macros} onChange={cambiar} />}
              </div>
            )}
          </>
        )}

        {paso === 3 && (
          <>
            <h1 className="titulo text-5xl leading-none">Tus hábitos</h1>
            <p className="text-suave mt-3 mb-6">Estos son los 10 hábitos recomendados. Cámbialos, quita o agrega los que quieras. Después puedes editarlos en Ajustes.</p>
            <EditorHabitos habitos={todos} />
          </>
        )}

        <div className="mt-auto flex gap-2 pt-8">
          {paso > 0 && (
            <button type="button" onClick={() => setPaso(paso - 1)} className="btn-sec !px-4" aria-label="Atrás">
              <Icon name="izq" size={20} />
            </button>
          )}
          <button className={`${paso === 0 && nubeConfigurada && !conSesion ? 'btn-sec' : 'btn-oro'} flex-1 !py-3.5`} disabled={!puedeSeguir || (conSesion && cuenta.vinculando)}>
            {paso === 0 && nubeConfigurada && !conSesion ? 'Continuar sin cuenta' : paso < PASOS - 1 ? 'Continuar' : '¡Empezar mi reto!'}
          </button>
        </div>
        {paso === 0 && (
          <p className="text-suave mt-4 text-center text-xs">
            ¿Tienes una copia de seguridad?{' '}
            <button type="button" onClick={() => archivo.current?.click()} className="text-dorado font-semibold underline-offset-2 hover:underline">
              Importar copia
            </button>
          </p>
        )}
      </form>
      <PiePagina />
      <HojaAcceso abierto={acceso} modoInicial="login" onCerrar={() => setAcceso(false)} />
    </div>
  );
}
