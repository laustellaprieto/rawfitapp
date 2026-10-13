import { useState } from 'react';
import { nubeConfigurada } from '../config';
import { AVISO_SALUD } from '../data/habitos';
import { AVISO_PRIVACIDAD } from '../data/privacidad';
import { fechaRelativa, toISO } from '../lib/fechas';
import {
  cambiarCompartirFotos,
  cambiarContrasena,
  cerrarSesion,
  dejarCoach,
  eliminarCuenta,
  iniciarSesion,
  recuperarContrasena,
  registrarse,
  resolverVinculo,
  sincronizarAhora,
  solicitarCoach,
  traducirError,
  useCuenta,
} from '../lib/nube';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const NOMBRE_COACH = 'Stella';

type Modo = 'registro' | 'login' | 'recuperar';

/** Hoja para crear cuenta, iniciar sesión o recuperar la contraseña. */
export function HojaAcceso({ abierto, modoInicial = 'registro', onCerrar }: { abierto: boolean; modoInicial?: Modo; onCerrar: () => void }) {
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Tu cuenta">
      {abierto && <FormAcceso modoInicial={modoInicial} onListo={onCerrar} />}
    </Sheet>
  );
}

function FormAcceso({ modoInicial, onListo }: { modoInicial: Modo; onListo: () => void }) {
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acepto, setAcepto] = useState(false);
  const [verAviso, setVerAviso] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (modo === 'registro') {
        const { necesitaConfirmar } = await registrarse(email.trim(), password, nombre.trim());
        if (necesitaConfirmar) setAviso(`Te enviamos un correo a ${email.trim()}. Ábrelo y toca el enlace para confirmar tu cuenta; después inicia sesión aquí.`);
        else onListo();
      } else if (modo === 'login') {
        await iniciarSesion(email.trim(), password);
        onListo();
      } else {
        await recuperarContrasena(email.trim());
        setAviso('Te enviamos un correo con un enlace para crear una contraseña nueva.');
      }
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setCargando(false);
    }
  };

  if (aviso)
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="bg-dorado/12 text-dorado grid size-14 place-items-center rounded-2xl">
          <Icon name="check" size={28} strokeWidth={2.4} />
        </div>
        <p className="text-sm">{aviso}</p>
        <button
          className="btn-oro w-full"
          onClick={() => {
            setAviso('');
            setModo('login');
          }}
        >
          Ir a iniciar sesión
        </button>
      </div>
    );

  const valido = email.includes('@') && (modo === 'recuperar' || password.length >= 6) && (modo !== 'registro' || (nombre.trim() && acepto));

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="bg-campo flex rounded-xl p-1">
        {(
          [
            ['registro', 'Crear cuenta'],
            ['login', 'Iniciar sesión'],
          ] as const
        ).map(([m, t]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setModo(m);
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${modo === m ? 'bg-dorado text-fondo' : 'text-suave'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {modo === 'registro' && (
        <p className="text-suave text-sm">Guarda tu progreso en la nube, úsalo en otro celular y trabaja con tu coach.</p>
      )}
      {modo === 'recuperar' && <p className="text-suave text-sm">Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.</p>}

      {modo === 'registro' && (
        <div>
          <label className="etiqueta" htmlFor="c-nombre">Nombre</label>
          <input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo" autoComplete="name" maxLength={40} />
        </div>
      )}
      <div>
        <label className="etiqueta" htmlFor="c-email">Correo</label>
        <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" autoComplete="email" inputMode="email" />
      </div>
      {modo !== 'recuperar' && (
        <div>
          <label className="etiqueta" htmlFor="c-pass">Contraseña</label>
          <input
            id="c-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo"
            autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : ''}
          />
        </div>
      )}

      {modo === 'registro' && (
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="accent-dorado mt-0.5 size-4 shrink-0" />
          <span className="text-suave">
            Acepto el{' '}
            <button type="button" onClick={() => setVerAviso(!verAviso)} className="text-dorado font-semibold underline-offset-2 hover:underline">
              aviso de privacidad
            </button>
            .
          </span>
        </label>
      )}
      {verAviso && modo === 'registro' && <AvisoPrivacidad />}

      {error && (
        <p role="alert" className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button className="btn-oro w-full" disabled={!valido || cargando}>
        {cargando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : modo === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}
      </button>

      {modo === 'login' && (
        <button type="button" onClick={() => setModo('recuperar')} className="text-suave text-center text-sm hover:text-texto">
          Olvidé mi contraseña
        </button>
      )}
      {modo === 'recuperar' && (
        <button type="button" onClick={() => setModo('login')} className="text-suave text-center text-sm hover:text-texto">
          Volver a iniciar sesión
        </button>
      )}
    </form>
  );
}

export function AvisoPrivacidad() {
  return (
    <div className="bg-campo/50 flex flex-col gap-3 rounded-2xl p-4 text-sm">
      {AVISO_PRIVACIDAD.map((p) => (
        <div key={p.titulo}>
          <p className="text-champagne font-semibold">{p.titulo}</p>
          <p className="text-suave mt-0.5">{p.texto}</p>
        </div>
      ))}
      <p className="text-suave text-xs">{AVISO_SALUD}</p>
    </div>
  );
}

const textoSync = (s: ReturnType<typeof useCuenta>) => {
  if (s.sync === 'sincronizando') return 'Sincronizando…';
  if (s.sync === 'sin-conexion') return 'Sin conexión: tus cambios se subirán al volver el internet.';
  if (s.sync === 'error') return 'No se pudo sincronizar. Lo reintentamos solos.';
  if (s.ultimaSync) return `Todo guardado en la nube · ${fechaRelativa(toISO(new Date(s.ultimaSync))).toLowerCase()} ${new Date(s.ultimaSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  return 'Conectado';
};

/** Sección "Cuenta" de Ajustes. */
export function SeccionCuenta({ onAbrirCoach }: { onAbrirCoach: () => void }) {
  const c = useCuenta();
  const [acceso, setAcceso] = useState<Modo | null>(null);
  const [aviso, setAviso] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  if (!nubeConfigurada) return null;

  const accion = (fn: () => Promise<unknown>) => async () => {
    setError('');
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setError(traducirError(e));
    } finally {
      setOcupado(false);
    }
  };

  if (!c.sesion)
    return (
      <section className="tarjeta animate-entrada !border-dorado/25 mb-4">
        <h2 className="titulo text-2xl">Tu cuenta</h2>
        <p className="text-suave mt-1 mb-4 text-sm">
          Opcional. Con una cuenta tu progreso se guarda en la nube, puedes usarlo en otro celular y, si eres cliente de {NOMBRE_COACH}, recibir tus entrenamientos,
          hábitos y plan de nutrición.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-oro" onClick={() => setAcceso('registro')}>
            Crear cuenta
          </button>
          <button className="btn-sec" onClick={() => setAcceso('login')}>
            Iniciar sesión
          </button>
        </div>
        <button onClick={() => setAviso(true)} className="text-suave mt-3 text-xs underline-offset-2 hover:underline">
          Aviso de privacidad
        </button>
        <HojaAcceso abierto={!!acceso} modoInicial={acceso ?? 'registro'} onCerrar={() => setAcceso(null)} />
        <Sheet abierto={aviso} onCerrar={() => setAviso(false)} titulo="Aviso de privacidad">
          <AvisoPrivacidad />
        </Sheet>
      </section>
    );

  const p = c.perfil;
  return (
    <section className="tarjeta animate-entrada mb-4 flex flex-col gap-4">
      <div>
        <h2 className="titulo text-2xl">Tu cuenta</h2>
        <p className="text-sm">{c.sesion.user.email}</p>
        <p className={`mt-1 flex items-center gap-1.5 text-xs ${c.sync === 'error' ? 'text-sube' : 'text-suave'}`}>
          <span className={`size-1.5 rounded-full ${c.sync === 'al-dia' ? 'bg-baja' : c.sync === 'sincronizando' ? 'bg-dorado animate-pulse' : 'bg-suave'}`} />
          {textoSync(c)}
        </p>
        <button onClick={() => sincronizarAhora()} disabled={c.sync === 'sincronizando'} className="text-dorado mt-1 text-xs font-semibold disabled:opacity-40">
          Sincronizar ahora
        </button>
      </div>

      {p?.rol === 'coach' ? (
        <div className="bg-dorado/10 rounded-2xl p-4">
          <p className="text-champagne font-semibold">Eres coach</p>
          <p className="text-suave mt-0.5 text-sm">Administra solicitudes, entrenamientos, hábitos y nutrición de tus clientes.</p>
          <button className="btn-oro mt-3 w-full" onClick={onAbrirCoach}>
            Abrir panel de coach
          </button>
        </div>
      ) : (
        p && (
          <div className="bg-campo/50 rounded-2xl p-4">
            <p className="text-champagne font-semibold">Coach</p>
            {p.estado === 'ninguno' && (
              <>
                <p className="text-suave mt-0.5 text-sm">¿Entrenas con {NOMBRE_COACH}? Pide ser su cliente para recibir tus planes en la app.</p>
                <button className="btn-oro mt-3 w-full" disabled={ocupado} onClick={accion(solicitarCoach)}>
                  Quiero ser cliente de {NOMBRE_COACH}
                </button>
              </>
            )}
            {p.estado === 'pendiente' && (
              <>
                <p className="text-suave mt-0.5 text-sm">Solicitud enviada. Te avisaremos aquí cuando {NOMBRE_COACH} te acepte.</p>
                <button className="text-suave mt-2 text-xs font-semibold" disabled={ocupado} onClick={accion(dejarCoach)}>
                  Cancelar solicitud
                </button>
              </>
            )}
            {p.estado === 'rechazado' && (
              <>
                <p className="text-suave mt-0.5 text-sm">Tu solicitud no fue aceptada. Si crees que es un error, escríbele a {NOMBRE_COACH} por Instagram.</p>
                <button className="btn-sec mt-3 w-full" disabled={ocupado} onClick={accion(solicitarCoach)}>
                  Volver a solicitar
                </button>
              </>
            )}
            {p.estado === 'aceptado' && (
              <>
                <p className="text-baja mt-0.5 text-sm font-semibold">✓ Eres cliente de {NOMBRE_COACH}</p>
                <label className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm">
                    Compartir mis fotos de progreso con mi coach
                    <span className="text-suave block text-xs">Si lo apagas, se borran de la nube y quedan solo en tu celular.</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.compartir_fotos}
                    disabled={ocupado}
                    onClick={accion(() => cambiarCompartirFotos(!p.compartir_fotos))}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${p.compartir_fotos ? 'bg-dorado' : 'bg-[#444]'}`}
                  >
                    <span className={`absolute top-0.5 size-6 rounded-full bg-white transition-all ${p.compartir_fotos ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </label>
                <button
                  className="text-suave mt-3 text-xs font-semibold"
                  disabled={ocupado}
                  onClick={() => confirm(`¿Dejar de ser cliente de ${NOMBRE_COACH}? Ya no verá tu progreso.`) && accion(dejarCoach)()}
                >
                  Dejar de ser cliente
                </button>
              </>
            )}
          </div>
        )
      )}

      {error && <p className="bg-sube/10 text-sube rounded-xl px-3 py-2 text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        <button
          className="btn-sec w-full"
          disabled={ocupado}
          onClick={() =>
            confirm('¿Cerrar sesión? Tus datos siguen guardados en tu cuenta y se borran de este celular.') && accion(() => cerrarSesion(true))()
          }
        >
          Cerrar sesión
        </button>
        <button onClick={() => setAviso(true)} className="text-suave text-xs underline-offset-2 hover:underline">
          Aviso de privacidad
        </button>
        <button
          className="text-sube/80 hover:text-sube text-xs font-semibold"
          disabled={ocupado}
          onClick={() =>
            confirm('¿Eliminar tu cuenta? Se borran para siempre todos tus datos y fotos de la nube y de este celular.') &&
            confirm('Esta acción no se puede deshacer. ¿Seguro?') &&
            accion(eliminarCuenta)()
          }
        >
          Eliminar mi cuenta
        </button>
      </div>
      <Sheet abierto={aviso} onCerrar={() => setAviso(false)} titulo="Aviso de privacidad">
        <AvisoPrivacidad />
      </Sheet>
    </section>
  );
}

/** Ventanas globales de la cuenta: elegir datos al vincular y nueva contraseña. */
export function DialogosCuenta() {
  const c = useCuenta();
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <Sheet abierto={c.decidirVinculo} onCerrar={() => resolverVinculo(false)} titulo="Tu cuenta ya tiene datos">
        <p className="text-suave mb-4 text-sm">
          En tu cuenta hay progreso guardado y este celular también tiene datos. Para no mezclarlos, usaremos los de tu cuenta y se reemplazarán los de este
          celular.
        </p>
        <p className="text-suave mb-5 text-xs">Si quieres conservar lo de este celular, cancela y exporta una copia desde Ajustes antes de iniciar sesión.</p>
        <div className="flex flex-col gap-2">
          <button className="btn-oro w-full" onClick={() => resolverVinculo(true)}>
            Usar los datos de mi cuenta
          </button>
          <button className="btn-sec w-full" onClick={() => resolverVinculo(false)}>
            Cancelar y cerrar sesión
          </button>
        </div>
      </Sheet>
      <Sheet abierto={c.recuperando} onCerrar={() => {}} titulo="Nueva contraseña">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await cambiarContrasena(pass);
            } catch (err) {
              setError(traducirError(err));
            }
          }}
        >
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="campo" placeholder="Mínimo 6 caracteres" autoComplete="new-password" aria-label="Nueva contraseña" />
          {error && <p className="text-sube text-sm">{error}</p>}
          <button className="btn-oro w-full" disabled={pass.length < 6}>
            Guardar contraseña
          </button>
        </form>
      </Sheet>
    </>
  );
}
