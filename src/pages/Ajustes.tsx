import { useEffect, useRef, useState } from 'react';
import { guardarAjustes } from '../lib/db';
import { fechaRelativa, toISO } from '../lib/dates';
import { borrarTodo, descargarCopia, importarCopia } from '../lib/backup';
import { num, parseNum } from '../lib/format';
import { useAjustes } from '../lib/hooks';
import { Icon } from '../components/Icon';
import { Encabezado } from '../components/ui';

function useEspacio() {
  const [uso, setUso] = useState<{ usado: number; total: number }>();
  const [persistente, setPersistente] = useState<boolean>();
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUso({ usado: e.usage ?? 0, total: e.quota ?? 0 }));
    navigator.storage?.persisted?.().then(setPersistente);
  }, []);
  return { uso, persistente };
}

const mb = (b: number) => (b / 1024 / 1024 < 1024 ? `${num(b / 1024 / 1024, 1)} MB` : `${num(b / 1024 ** 3, 1)} GB`);

export default function Ajustes() {
  const a = useAjustes();
  const { uso, persistente } = useEspacio();
  const archivo = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | 'cargando'; texto: string }>();

  const exportar = async () => {
    setEstado({ tipo: 'cargando', texto: 'Preparando tu copia…' });
    try {
      await descargarCopia();
      await guardarAjustes({ ultimaCopia: new Date().toISOString() });
      setEstado({ tipo: 'ok', texto: 'Copia lista. Guárdala en un lugar seguro (Drive, correo, computadora).' });
    } catch {
      setEstado({ tipo: 'error', texto: 'No se pudo crear la copia. Inténtalo de nuevo.' });
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm('Importar la copia reemplazará TODOS los datos actuales de este dispositivo. ¿Continuar?')) {
      archivo.current!.value = '';
      return;
    }
    setEstado({ tipo: 'cargando', texto: 'Importando…' });
    try {
      const r = await importarCopia(f);
      setEstado({
        tipo: 'ok',
        texto: `Copia importada: ${r.habitos} hábitos, ${r.medidas} registros de medidas, ${r.entrenos} entrenos y ${r.fotos} fotos.`,
      });
    } catch (e) {
      setEstado({ tipo: 'error', texto: (e as Error).message || 'No se pudo importar la copia.' });
    } finally {
      archivo.current!.value = '';
    }
  };

  const borrar = async () => {
    if (!confirm('¿Borrar TODOS tus datos de este dispositivo? Esta acción no se puede deshacer.')) return;
    if (!confirm('Última confirmación: ¿seguro? Te recomendamos exportar una copia antes.')) return;
    await borrarTodo();
    setEstado({ tipo: 'ok', texto: 'Se borraron todos los datos.' });
  };

  return (
    <>
      <Encabezado subtitulo="Tu kit, a tu manera" titulo="Ajustes" />

      <section className="tarjeta animate-entrada mb-4 flex flex-col gap-4">
        <h2 className="titulo text-2xl">Perfil</h2>
        <div>
          <label className="etiqueta" htmlFor="a-nombre">Nombre</label>
          <input id="a-nombre" key={a.nombre} defaultValue={a.nombre} onBlur={(e) => guardarAjustes({ nombre: e.target.value.trim() })} className="campo" maxLength={30} placeholder="Tu nombre" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="a-obj">Objetivo</label>
          <input id="a-obj" key={a.objetivo} defaultValue={a.objetivo} onBlur={(e) => guardarAjustes({ objetivo: e.target.value.trim() })} className="campo" maxLength={80} placeholder="Ej.: Ganar fuerza y bajar 5 kg" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="a-meta">Peso objetivo ({a.unidadPeso})</label>
          <input
            id="a-meta"
            key={a.pesoObjetivo ?? 'x'}
            inputMode="decimal"
            defaultValue={a.pesoObjetivo?.toString() ?? ''}
            onBlur={(e) => guardarAjustes({ pesoObjetivo: parseNum(e.target.value) })}
            className="campo"
            placeholder="Opcional"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Selector etiqueta="Peso" valor={a.unidadPeso} opciones={['kg', 'lb']} onChange={(v) => guardarAjustes({ unidadPeso: v as 'kg' | 'lb' })} />
          <Selector etiqueta="Medidas" valor={a.unidadMedida} opciones={['cm', 'in']} onChange={(v) => guardarAjustes({ unidadMedida: v as 'cm' | 'in' })} />
        </div>
        <p className="text-suave -mt-2 text-xs">Cambiar la unidad no convierte los valores ya registrados.</p>
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
          Última copia: <b className="text-texto">{a.ultimaCopia ? fechaRelativa(toISO(new Date(a.ultimaCopia))) : 'nunca'}</b>
        </p>
        {uso && (
          <p className="text-suave mt-1 text-xs">
            Espacio usado: <b className="text-texto">{mb(uso.usado)}</b>
            {persistente !== undefined && <> · Almacenamiento {persistente ? 'protegido ✓' : 'estándar'}</>}
          </p>
        )}
      </section>

      <section className="tarjeta animate-entrada mb-4">
        <h2 className="titulo mb-2 flex items-center gap-2 text-2xl">
          <Icon name="celular" size={20} className="text-dorado" /> Instalar la app
        </h2>
        <ul className="text-suave flex flex-col gap-2 text-sm">
          <li>
            <b className="text-texto">iPhone (Safari):</b> toca Compartir <span aria-hidden>⬆️</span> y luego “Agregar a inicio”.
          </li>
          <li>
            <b className="text-texto">Android (Chrome):</b> abre el menú ⋮ y toca “Instalar app” o “Agregar a la pantalla principal”.
          </li>
          <li>Una vez instalada funciona sin internet.</li>
        </ul>
      </section>

      <section className="tarjeta animate-entrada">
        <h2 className="titulo text-sube mb-2 text-2xl">Zona de cuidado</h2>
        <p className="text-suave mb-3 text-sm">Borra todos los hábitos, medidas, fotos y entrenos de este dispositivo.</p>
        <button onClick={borrar} className="btn-peligro w-full">
          <Icon name="basura" size={18} /> Borrar todos mis datos
        </button>
      </section>
    </>
  );
}

function Selector({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: string; opciones: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="etiqueta">{etiqueta}</span>
      <div className="bg-campo flex rounded-xl p-1">
        {opciones.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${valor === o ? 'bg-dorado text-fondo' : 'text-suave'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
