import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Perfil } from '../lib/db';
import { diaDelReto, diasEntre, fechaLarga, hoyISO } from '../lib/fechas';
import { hechosDia, porcentajeDia } from '../lib/habitos';
import { useHabitos, useRegistros } from '../lib/hooks';
import { estadoCheckinFotos } from '../lib/progreso';
import type { Ir } from '../App';
import { HabitoFila } from '../components/HabitoFila';
import { Icon } from '../components/Icon';
import { CaloriasHoy } from '../components/CaloriasHoy';
import { SeccionRacha } from '../components/Racha';
import { EntrenoDeHoy, TarjetaNutricion } from '../components/PlanCoach';
import { Anillo } from '../components/ui';

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

export default function Hoy({ perfil, ir }: { perfil: Perfil; ir: Ir }) {
  const { activos } = useHabitos();
  const idx = useRegistros();
  const fechasCheckins = useLiveQuery(() => db.checkins.orderBy('fecha').keys(), []) as string[] | undefined;
  const hoy = hoyISO();

  const hechos = idx.get(hoy) ?? new Set<number>();
  const pct = porcentajeDia(hoy, activos, idx);
  const nHechos = hechosDia(hoy, activos, idx);
  const dia = diaDelReto(perfil.fechaInicio);
  const frase = FRASES[Math.floor(Date.now() / 86_400_000) % FRASES.length];
  const fotos = fechasCheckins && dia >= 1 ? estadoCheckinFotos(perfil.fechaInicio, fechasCheckins) : undefined;

  return (
    <>
      <header className="animate-entrada mb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-suave text-xs font-medium tracking-[0.15em] uppercase">{fechaLarga(hoy)}</p>
          {dia >= 1 ? (
            <span className="bg-dorado/15 text-dorado titulo shrink-0 rounded-full px-3 py-1 text-lg leading-none">Día {dia}</span>
          ) : (
            <span className="bg-campo text-suave shrink-0 rounded-full px-3 py-1 text-xs font-semibold">Empieza en {diasEntre(hoy, perfil.fechaInicio)} d</span>
          )}
        </div>
        <h1 className="titulo mt-2 text-[44px] leading-none">
          Hola, <span className="text-dorado">{perfil.nombre}</span>
        </h1>
        <p className="text-champagne/80 mt-2 text-sm italic">“{frase}”</p>
      </header>

      {fotos?.pendiente && (
        <button
          onClick={() => ir('progreso', 'fotos')}
          className="animate-entrada bg-dorado/[0.09] border-dorado/30 mb-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left"
        >
          <span className="bg-dorado text-fondo grid size-10 shrink-0 place-items-center rounded-xl">
            <Icon name="camara" size={20} />
          </span>
          <span className="flex-1">
            <span className="text-champagne block text-sm font-semibold">{fotos.numero === 0 ? 'Toma tus fotos iniciales' : '¡Toca foto de progreso!'}</span>
            <span className="text-suave block text-xs">Frente, perfil y espalda. Misma luz, ropa, hora y distancia.</span>
          </span>
          <Icon name="der" size={18} className="text-dorado" />
        </button>
      )}

      <EntrenoDeHoy onEmpezar={(r) => ir('entreno', `rutina:${r.uid}`)} />

      {/* Hábitos de hoy */}
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
              {activos.length === 0 ? 'Agrega hábitos en Ajustes.' : pct === 1 ? '¡Completaste todo! 🔥' : `${nHechos} de ${activos.length} cumplidos`}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {activos.map((h) => (
            <HabitoFila key={h.id} habito={h} fecha={hoy} hecho={hechos.has(h.id!)} />
          ))}
        </div>
      </section>

      <SeccionRacha activos={activos} idx={idx} />

      <CaloriasHoy perfil={perfil} />

      <TarjetaNutricion />

      {/* Accesos rápidos */}
      <div className="animate-entrada mb-4 grid grid-cols-2 gap-3">
        <button onClick={() => ir('progreso', 'medicion')} className="tarjeta flex flex-col items-start gap-3 text-left transition hover:!border-white/10 active:scale-[0.98]">
          <span className="bg-dorado/12 text-dorado grid size-10 place-items-center rounded-xl">
            <Icon name="medidas" size={20} />
          </span>
          <span className="text-sm font-semibold">Registrar medidas</span>
        </button>
        <button onClick={() => ir('entreno', 'nueva')} className="tarjeta flex flex-col items-start gap-3 text-left transition hover:!border-white/10 active:scale-[0.98]">
          <span className="bg-dorado/12 text-dorado grid size-10 place-items-center rounded-xl">
            <Icon name="entrenos" size={20} />
          </span>
          <span className="text-sm font-semibold">Registrar entreno</span>
        </button>
      </div>

      {fotos && !fotos.pendiente && (
        <p className="text-suave animate-entrada mb-4 flex items-center gap-2 px-1 text-xs">
          <Icon name="camara" size={14} className="text-dorado" />
          Próxima foto de progreso {fotos.faltan === 1 ? 'mañana' : `en ${fotos.faltan} días`}.
        </p>
      )}

      {perfil.objetivo && (
        <section className="tarjeta animate-entrada !border-dorado/20 bg-gradient-to-br from-[#1C1C1C] to-[#231f17]">
          <p className="text-dorado mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
            <Icon name="trofeo" size={14} /> Mi objetivo
          </p>
          <p className="text-champagne text-lg font-medium">{perfil.objetivo}</p>
        </section>
      )}
    </>
  );
}
