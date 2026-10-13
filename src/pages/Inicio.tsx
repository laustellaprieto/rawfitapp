import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, guardarAjustes } from '../lib/db';
import { diasEntre, fechaCorta, fechaLarga, hoyISO, inicioSemana } from '../lib/dates';
import { num } from '../lib/format';
import { useAjustes, useEntrenos, useHabitos, useMedidas, useRegistros } from '../lib/hooks';
import { primeroYUltimo } from '../lib/medidas';
import { porcentajeDia, rachaDiasCompletos } from '../lib/stats';
import type { Pagina } from '../App';
import { GraficaLinea } from '../components/Graficas';
import { HabitoFila } from '../components/HabitoFila';
import { Icon } from '../components/Icon';
import { Anillo, Delta, Stat } from '../components/ui';

const FRASES = [
  'La constancia le gana a la motivación.',
  'No tiene que ser perfecto, tiene que ser constante.',
  'Pequeños hábitos, grandes resultados.',
  'Tu único rival es quien eras ayer.',
  'Lo que se mide, se mejora.',
  'Disciplina es elegir lo que más quieres sobre lo que quieres ahora.',
  'Un día a la vez. Un hábito a la vez.',
  'El progreso no siempre se ve en la báscula.',
  'Hazlo por la versión de ti que te espera.',
  'Cada repetición cuenta.',
];

export default function Inicio({ ir }: { ir: (p: Pagina) => void }) {
  const ajustes = useAjustes();
  const { activos } = useHabitos();
  const idx = useRegistros();
  const medidas = useMedidas() ?? [];
  const entrenos = useEntrenos() ?? [];
  const ultimaFoto = useLiveQuery(() => db.fotos.orderBy('fecha').last(), []);
  const hoy = hoyISO();

  const hechos = idx.get(hoy) ?? new Set<number>();
  const pct = porcentajeDia(hoy, activos, idx);
  const racha = rachaDiasCompletos(activos, idx);
  const peso = primeroYUltimo(medidas, 'peso');
  const entrenosSemana = entrenos.filter((e) => e.fecha >= inicioSemana(hoy)).length;
  const frase = FRASES[Math.floor(Date.now() / 86_400_000) % FRASES.length];
  const ultimaMedida = medidas[medidas.length - 1];
  const diasSinMedir = ultimaMedida ? diasEntre(ultimaMedida.fecha, hoy) : undefined;
  const diasSinFoto = ultimaFoto ? diasEntre(ultimaFoto.fecha, hoy) : undefined;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <header className="animate-entrada mb-5">
        <p className="text-suave text-xs font-medium tracking-[0.2em] uppercase first-letter:uppercase">{fechaLarga(hoy)}</p>
        <h1 className="titulo mt-1 text-[42px] leading-none">
          {saludo}
          {ajustes.nombre ? <span className="text-dorado">, {ajustes.nombre}</span> : ''}
        </h1>
        <p className="text-champagne/80 mt-2 text-sm italic">“{frase}”</p>
      </header>

      {!ajustes.nombre && <Bienvenida />}

      {/* Hoy */}
      <section className="tarjeta animate-entrada mb-4">
        <div className="mb-4 flex items-center gap-4">
          <Anillo progreso={pct} tam={84} grosor={8}>
            <div className="text-center leading-none">
              <span className="titulo text-2xl">{Math.round(pct * 100)}</span>
              <span className="text-suave text-xs">%</span>
            </div>
          </Anillo>
          <div className="min-w-0">
            <h2 className="titulo text-3xl leading-none">Hábitos de hoy</h2>
            <p className="text-suave mt-1 text-sm">
              {activos.length === 0
                ? 'Aún no tienes hábitos.'
                : pct === 1
                  ? '¡Completaste todo! 🔥'
                  : `${activos.filter((h) => hechos.has(h.id!)).length} de ${activos.length} · ¡tú puedes!`}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {activos.map((h) => (
            <HabitoFila key={h.id} habito={h} fecha={hoy} hecho={hechos.has(h.id!)} />
          ))}
        </div>
        <button onClick={() => ir('habitos')} className="text-dorado mt-3 inline-flex items-center gap-1 text-sm font-semibold">
          Ver semana y estadísticas <Icon name="der" size={16} />
        </button>
      </section>

      {/* Resumen */}
      <div className="animate-entrada mb-4 grid grid-cols-2 gap-3">
        <Stat etiqueta="Racha" icono="fuego" valor={racha} extra={<span className="text-suave">{racha === 1 ? 'día completo' : 'días completos'}</span>} />
        <Stat etiqueta="Entrenos" icono="entrenos" valor={entrenosSemana} extra={<span className="text-suave">esta semana</span>} />
        <button onClick={() => ir('medidas')} className="text-left">
          <Stat
            etiqueta="Peso"
            icono="medidas"
            valor={
              peso ? (
                <>
                  {num(peso.ultimo.peso)}
                  <span className="text-suave ml-1 font-sans text-xs">{ajustes.unidadPeso}</span>
                </>
              ) : (
                '—'
              )
            }
            extra={peso && peso.n > 1 ? <Delta valor={peso.ultimo.peso! - peso.primero.peso!} unidad={ajustes.unidadPeso} /> : <span className="text-suave">registrar</span>}
          />
        </button>
        <button onClick={() => ir('fotos')} className="text-left">
          <Stat
            etiqueta="Fotos"
            icono="camara"
            valor={diasSinFoto === undefined ? '—' : diasSinFoto === 0 ? 'Hoy' : `${diasSinFoto} d`}
            extra={<span className="text-suave">{diasSinFoto === undefined ? 'sin fotos aún' : 'desde la última'}</span>}
          />
        </button>
      </div>

      {/* Recordatorios */}
      {(diasSinMedir === undefined || diasSinMedir >= 14) && (
        <Aviso texto={diasSinMedir === undefined ? 'Registra tus medidas iniciales para ver tu evolución.' : `Llevas ${diasSinMedir} días sin registrar medidas.`} accion="Registrar" onClick={() => ir('medidas')} />
      )}
      {diasSinFoto !== undefined && diasSinFoto >= 28 && (
        <Aviso texto={`Han pasado ${diasSinFoto} días desde tu última foto. ¡Es buen momento para otra!`} accion="Tomar foto" onClick={() => ir('fotos')} />
      )}

      {peso && peso.n > 1 && (
        <section className="tarjeta animate-entrada mb-4">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="titulo text-2xl">Evolución del peso</h2>
            {ajustes.pesoObjetivo !== undefined && (
              <span className="text-suave text-xs">
                Meta: <b className="text-champagne">{num(ajustes.pesoObjetivo)} {ajustes.unidadPeso}</b>
              </span>
            )}
          </div>
          <GraficaLinea
            alto={170}
            datos={medidas.filter((m) => m.peso !== undefined).map((m) => ({ x: fechaCorta(m.fecha), y: m.peso! }))}
            unidad={ajustes.unidadPeso}
            meta={ajustes.pesoObjetivo}
          />
        </section>
      )}

      {ajustes.objetivo && (
        <section className="tarjeta animate-entrada border-dorado/20! bg-gradient-to-br from-[#1C1C1C] to-[#231f17]">
          <p className="text-dorado mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
            <Icon name="trofeo" size={14} /> Mi objetivo
          </p>
          <p className="text-champagne text-lg font-medium">{ajustes.objetivo}</p>
        </section>
      )}
    </>
  );
}

function Aviso({ texto, accion, onClick }: { texto: string; accion: string; onClick: () => void }) {
  return (
    <div className="animate-entrada bg-dorado/[0.08] border-dorado/20 mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3">
      <Icon name="reloj" size={20} className="text-dorado shrink-0" />
      <p className="flex-1 text-sm">{texto}</p>
      <button onClick={onClick} className="text-dorado shrink-0 text-sm font-semibold">
        {accion}
      </button>
    </div>
  );
}

function Bienvenida() {
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  return (
    <form
      className="tarjeta animate-entrada border-dorado/25! mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (nombre.trim()) guardarAjustes({ nombre: nombre.trim(), objetivo: objetivo.trim() });
      }}
    >
      <h2 className="titulo text-champagne text-2xl">¡Te damos la bienvenida! 👋</h2>
      <p className="text-suave mt-1 mb-4 text-sm">Este es tu kit para seguir tu progreso. Cuéntanos un poco de ti para personalizarlo.</p>
      <label className="etiqueta" htmlFor="b-nombre">¿Cómo te llamas?</label>
      <input id="b-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo mb-3" placeholder="Tu nombre" maxLength={30} />
      <label className="etiqueta" htmlFor="b-obj">Tu objetivo (opcional)</label>
      <input id="b-obj" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="campo mb-4" placeholder="Ej.: Ganar fuerza y bajar 5 kg" maxLength={80} />
      <button className="btn-oro w-full" disabled={!nombre.trim()}>
        Empezar
      </button>
    </form>
  );
}
