import { useEffect, useRef, useState } from 'react';
import { AVISO_SALUD } from '../data/habitos';
import { guardarPerfil, type Perfil } from '../lib/db';
import { borrarTodo, descargarCopia, importarCopia } from '../lib/copia';
import { fechaRelativa, toISO } from '../lib/fechas';
import { num } from '../lib/format';
import { useHabitos } from '../lib/hooks';
import { EditorCalorias } from '../components/Calorias';
import { SeccionCuenta } from '../components/Cuenta';
import { useCuenta } from '../lib/nube';
import type { Ir } from '../App';
import { borrarErrores, erroresGuardados } from '../lib/version';
import { EditorHabitos } from '../components/EditorHabitos';
import { calcularCalorias, kcal, macrosDelPerfil, textoMeta } from '../lib/calorias';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Encabezado } from '../components/ui';

function useEspacio() {
  const [usado, setUsado] = useState<number>();
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsado(e.usage ?? 0));
  }, []);
  return usado;
}

const mb = (b: number) => `${num(b / 1024 / 1024, 1)} MB`;

export default function Ajustes({ perfil, ir }: { perfil: Perfil; ir: Ir }) {
  const usado = useEspacio();
  const { todos } = useHabitos();
  const archivo = useRef<HTMLInputElement>(null);
  const [habitosAbierto, setHabitosAbierto] = useState(false);
  const [caloriasAbierto, setCaloriasAbierto] = useState(false);
  const calorias = calcularCalorias(perfil);
  const conSesion = !!useCuenta().sesion;
  const macros = macrosDelPerfil(perfil);
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | 'cargando'; texto: string }>();

  const exportar = async () => {
    setEstado({ tipo: 'cargando', texto: 'Preparando tu copia…' });
    try {
      if (!(await descargarCopia())) return setEstado(undefined);
      await guardarPerfil({ ultimaCopia: new Date().toISOString() });
      setEstado({ tipo: 'ok', texto: 'Copia lista. Guárdala en un lugar seguro (Drive, correo o tu computadora).' });
    } catch {
      setEstado({ tipo: 'error', texto: 'No se pudo crear la copia. Inténtalo de nuevo.' });
    }
  };

  const importar = async (f: File | undefined) => {
    const limpiar = () => archivo.current && (archivo.current.value = '');
    if (!f) return;
    if (!confirm('Importar la copia reemplazará TODOS los datos actuales de este dispositivo. ¿Continuar?')) return limpiar();
    setEstado({ tipo: 'cargando', texto: 'Importando…' });
    try {
      const r = await importarCopia(f);
      setEstado({
        tipo: 'ok',
        texto: `Copia importada: ${r.habitos ?? 0} hábitos, ${r.mediciones ?? 0} mediciones, ${r.checkins ?? 0} check-ins de fotos y ${r.sesiones ?? 0} sesiones de entreno.`,
      });
    } catch (e) {
      setEstado({ tipo: 'error', texto: (e as Error).message || 'No se pudo importar la copia.' });
    } finally {
      limpiar();
    }
  };

  const borrar = async () => {
    if (!confirm('¿Borrar TODOS tus datos de este dispositivo? Esta acción no se puede deshacer.')) return;
    if (!confirm('Última confirmación: ¿seguro? Te recomendamos exportar una copia antes.')) return;
    await borrarTodo();
  };

  return (
    <>
      <Encabezado subtitulo="Tu app, a tu manera" titulo="Ajustes" />

      <SeccionCuenta onAbrirCoach={() => ir('coach')} />

      <section className="tarjeta animate-entrada mb-4 flex flex-col gap-4">
        <h2 className="titulo text-2xl">Mis datos</h2>
        <Campo id="a-nombre" etiqueta="Nombre" valor={perfil.nombre} onGuardar={(v) => v && guardarPerfil({ nombre: v })} />
        <div>
          <label className="etiqueta" htmlFor="a-inicio">Fecha de inicio</label>
          <input id="a-inicio" type="date" value={perfil.fechaInicio} onChange={(e) => e.target.value && guardarPerfil({ fechaInicio: e.target.value })} className="campo" />
        </div>
        <Campo id="a-obj" etiqueta="Objetivo" valor={perfil.objetivo} onGuardar={(v) => guardarPerfil({ objetivo: v })} />
      </section>

      <section className="tarjeta animate-entrada mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="titulo text-2xl">Calorías y macros</h2>
            <p className="text-suave text-sm">
              {calorias ? `${kcal(calorias.objetivo)} · ${textoMeta(calorias)}` : 'Aún sin calcular'}
            </p>
            {macros && (
              <p className="text-suave mt-0.5 text-xs">
                Proteína {macros.proteina.gramos} g · Carbohidratos {macros.carbos.gramos} g · Grasa {macros.grasa.gramos} g
              </p>
            )}
            {perfil.sexo && (
              <p className="text-suave mt-0.5 text-xs">
                {perfil.edad} años · {num(perfil.estatura)} cm · {num(perfil.peso)} kg
              </p>
            )}
          </div>
          <button onClick={() => setCaloriasAbierto(true)} className="btn-sec !py-2.5">
            <Icon name="editar" size={16} /> {calorias ? 'Editar' : 'Calcular'}
          </button>
        </div>
      </section>

      <section className="tarjeta animate-entrada mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="titulo text-2xl">Mis hábitos</h2>
            <p className="text-suave text-sm">
              {todos.filter((h) => h.activo).length} activos{todos.some((h) => !h.activo) && ` · ${todos.filter((h) => !h.activo).length} en pausa`}
            </p>
          </div>
          <button onClick={() => setHabitosAbierto(true)} className="btn-sec !py-2.5">
            <Icon name="editar" size={16} /> Editar
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {todos
            .filter((h) => h.activo)
            .map((h) => (
              <span key={h.id} className="bg-campo rounded-full px-2.5 py-1 text-xs">
                {h.emoji} {h.nombre}
              </span>
            ))}
        </div>
      </section>

      <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo text-2xl">Copia de seguridad</h2>
        <p className="text-suave mt-1 mb-4 text-sm">
          Tus datos viven solo en este dispositivo. Exporta una copia (incluye tus fotos) para no perder nada si cambias de celular o borras el navegador.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={exportar} disabled={estado?.tipo === 'cargando'} className="btn-oro w-full">
            <Icon name="descargar" size={18} /> Exportar copia de seguridad
          </button>
          <button onClick={() => archivo.current?.click()} disabled={estado?.tipo === 'cargando'} className="btn-sec w-full">
            <Icon name="subir" size={18} /> Importar copia
          </button>
          <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importar(e.target.files?.[0])} />
        </div>
        {estado && (
          <p
            role="status"
            className={`animate-entrada mt-3 rounded-xl px-3 py-2 text-sm ${
              estado.tipo === 'ok' ? 'bg-baja/10 text-baja' : estado.tipo === 'error' ? 'bg-sube/10 text-sube' : 'text-suave bg-white/5'
            }`}
          >
            {estado.texto}
          </p>
        )}
        <p className="text-suave mt-4 text-xs">
          Última copia: <b className="text-texto">{perfil.ultimaCopia ? fechaRelativa(toISO(new Date(perfil.ultimaCopia))) : 'nunca'}</b>
          {usado !== undefined && <> · Espacio usado: {mb(usado)}</>}
        </p>
      </section>

      <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo mb-2 flex items-center gap-2 text-2xl">
          <Icon name="celular" size={20} className="text-dorado" /> Instalar la app
        </h2>
        <ul className="text-suave flex flex-col gap-2 text-sm">
          <li>
            <b className="text-texto">iPhone (Safari):</b> toca Compartir y luego “Agregar a inicio”.
          </li>
          <li>
            <b className="text-texto">Android (Chrome):</b> abre el menú ⋮ y toca “Instalar app” o “Agregar a la pantalla principal”.
          </li>
          <li>Una vez instalada, funciona sin internet.</li>
        </ul>
      </section>

      {!conSesion && <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo text-sube mb-2 text-2xl">Borrar datos</h2>
        <p className="text-suave mb-3 text-sm">Borra hábitos, mediciones, fotos y entrenos de este dispositivo y vuelve a empezar.</p>
        <button onClick={borrar} className="btn-peligro w-full">
          <Icon name="basura" size={18} /> Borrar todos mis datos
        </button>
      </section>}

      <ErroresRecientes />

      <p className="text-suave flex items-start gap-2 px-1 text-xs">
        <Icon name="escudo" size={16} className="text-dorado shrink-0" />
        {AVISO_SALUD}
      </p>

      <Sheet abierto={caloriasAbierto} onCerrar={() => setCaloriasAbierto(false)} titulo="Tus calorías">
        {caloriasAbierto && <EditorCalorias perfil={perfil} onCerrar={() => setCaloriasAbierto(false)} />}
      </Sheet>
      <Sheet abierto={habitosAbierto} onCerrar={() => setHabitosAbierto(false)} titulo="Mis hábitos">
        <EditorHabitos habitos={todos} />
      </Sheet>
    </>
  );
}

function Campo({ id, etiqueta, valor, onGuardar, decimal }: { id: string; etiqueta: string; valor: string; onGuardar: (v: string) => void; decimal?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        key={valor}
        defaultValue={valor}
        inputMode={decimal ? 'decimal' : undefined}
        onBlur={(e) => e.target.value.trim() !== valor && onGuardar(e.target.value.trim())}
        className="campo"
      />
    </div>
  );
}

/** Si hubo fallas, permite copiarlas para enviarlas a soporte. */
function ErroresRecientes() {
  const [errores, setErrores] = useState(erroresGuardados);
  const [copiado, setCopiado] = useState(false);
  if (!errores.length) return null;
  const texto = errores.map((e) => `${e.fecha} · ${e.mensaje}\n${e.donde ?? ''}`).join('\n\n');
  return (
    <section className="tarjeta animate-entrada mb-4">
      <h2 className="titulo text-2xl">Fallas recientes</h2>
      <p className="text-suave mt-1 mb-3 text-sm">
        La app registró {errores.length} {errores.length === 1 ? 'falla' : 'fallas'}. Si notaste algo raro, copia este reporte y envíaselo a soporte.
      </p>
      <div className="flex gap-2">
        <button
          className="btn-sec flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
            } catch {
              prompt('Copia este texto:', texto);
            }
          }}
        >
          {copiado ? '¡Copiado!' : 'Copiar reporte'}
        </button>
        <button
          className="btn-sec"
          onClick={() => {
            borrarErrores();
            setErrores([]);
          }}
        >
          Borrar
        </button>
      </div>
    </section>
  );
}
