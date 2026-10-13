import { useEffect, useRef, useState } from 'react';
import { AVISO_SALUD } from '../data/habitos';
import { guardarPerfil, type Perfil } from '../lib/db';
import { borrarTodo, descargarCopia, importarCopia } from '../lib/copia';
import { fechaRelativa, toISO } from '../lib/fechas';
import { num, numTxt, parseNum } from '../lib/format';
import { useHabitos } from '../lib/hooks';
import { EditorHabitos } from '../components/EditorHabitos';
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

export default function Ajustes({ perfil }: { perfil: Perfil }) {
  const usado = useEspacio();
  const { todos } = useHabitos();
  const archivo = useRef<HTMLInputElement>(null);
  const [habitosAbierto, setHabitosAbierto] = useState(false);
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
      <Encabezado subtitulo="Tu kit, a tu manera" titulo="Ajustes" />

      <section className="tarjeta animate-entrada mb-4 flex flex-col gap-4">
        <h2 className="titulo text-2xl">Mis datos</h2>
        <Campo id="a-nombre" etiqueta="Nombre" valor={perfil.nombre} onGuardar={(v) => v && guardarPerfil({ nombre: v })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta" htmlFor="a-inicio">Fecha de inicio</label>
            <input id="a-inicio" type="date" value={perfil.fechaInicio} onChange={(e) => e.target.value && guardarPerfil({ fechaInicio: e.target.value })} className="campo" />
          </div>
          <Campo
            id="a-est"
            etiqueta="Estatura (cm)"
            valor={numTxt(perfil.estatura)}
            decimal
            onGuardar={(v) => {
              const n = parseNum(v);
              if (n === undefined || (n >= 100 && n <= 250)) guardarPerfil({ estatura: n });
            }}
          />
        </div>
        <Campo id="a-obj" etiqueta="Objetivo" valor={perfil.objetivo} onGuardar={(v) => guardarPerfil({ objetivo: v })} />
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

      <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo text-sube mb-2 text-2xl">Borrar datos</h2>
        <p className="text-suave mb-3 text-sm">Borra hábitos, mediciones, fotos y entrenos de este dispositivo y vuelve a empezar.</p>
        <button onClick={borrar} className="btn-peligro w-full">
          <Icon name="basura" size={18} /> Borrar todos mis datos
        </button>
      </section>

      <p className="text-suave flex items-start gap-2 px-1 text-xs">
        <Icon name="escudo" size={16} className="text-dorado shrink-0" />
        {AVISO_SALUD}
      </p>

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
