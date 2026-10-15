import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db, type Sesion } from '../../lib/db';
import { fechaRelativa, hoyISO, inicioSemana, nombreMes } from '../../lib/fechas';
import { num } from '../../lib/format';
import { calcularRecords, formatoVolumen, volumenPorGrupo, volumenSesion } from '../../lib/entreno';
import { BarrasHorizontales, MiniLinea } from '../../components/GraficasSimples';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { BotonAgregar, Encabezado, Segmentos, Stat, Vacio } from '../../components/ui';
import { FormSesion } from './FormSesion';
import { TuPlanEntreno } from '../../components/PlanCoach';
import { sesionDesdeRutina } from '../../lib/rutinas';

type Vista = 'historial' | 'records' | 'grupos';

export default function Entreno({ accion }: { accion?: string }) {
  const sesiones = useLiveQuery(() => db.sesiones.orderBy('fecha').reverse().toArray(), []);
  const lista = useMemo(() => sesiones ?? [], [sesiones]);
  const [editando, setEditando] = useState<Sesion | null>(null);
  const [vista, setVista] = useState<Vista>('historial');
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);

  const nueva = () => setEditando({ fecha: hoy, nombre: '', ejercicios: [] });
  useEffect(() => {
    if (accion === 'nueva') nueva();
    else if (accion?.startsWith('rutina:'))
      db.rutinas
        .where('uid')
        .equals(accion.slice(7))
        .first()
        .then((r) => r && setEditando(sesionDesdeRutina(r)));
  }, [accion]);

  const delMes = lista.filter((s) => s.fecha.startsWith(mes));
  const semana = lista.filter((s) => s.fecha >= inicioSemana(hoy));
  const volumenMes = delMes.reduce((t, s) => t + volumenSesion(s), 0);
  const records = useMemo(() => calcularRecords(lista), [lista]);
  const grupos = volumenPorGrupo(lista, periodo === 'semana' ? inicioSemana(hoy) : `${mes}-01`);

  return (
    <>
      <Encabezado subtitulo="Cada serie suma" titulo="Entreno" accion={<BotonAgregar onClick={nueva}>Nueva sesión</BotonAgregar>} />

      <TuPlanEntreno onEmpezar={setEditando} />

      {sesiones !== undefined && lista.length === 0 ? (
        <Vacio
          icono="entrenos"
          titulo="Registra tu primera sesión"
          texto="Ponle nombre (por ejemplo, “Pierna A”), agrega ejercicios del banco y anota tus series con reps, kg y RIR."
          accion={<BotonAgregar onClick={nueva}>Nueva sesión</BotonAgregar>}
        />
      ) : (
        <>
          <div className="animate-entrada mb-4 grid grid-cols-3 gap-3">
            <Stat etiqueta="Este mes" valor={delMes.length} extra={<span className="text-suave">{delMes.length === 1 ? 'sesión' : 'sesiones'}</span>} />
            <Stat etiqueta="Semana" valor={semana.length} extra={<span className="text-suave">{semana.length === 1 ? 'sesión' : 'sesiones'}</span>} />
            <Stat etiqueta="Volumen" valor={<span className="text-[26px]">{formatoVolumen(volumenMes)}</span>} extra={<span className="text-suave">este mes</span>} />
          </div>

          <div className="mb-4">
            <Segmentos
              opciones={[
                { valor: 'historial' as const, texto: 'Historial' },
                { valor: 'records' as const, texto: 'Récords' },
                { valor: 'grupos' as const, texto: 'Por grupo muscular' },
              ]}
              valor={vista}
              onChange={setVista}
            />
          </div>

          {vista === 'historial' && <Historial lista={lista} onAbrir={setEditando} />}

          {vista === 'records' && (
            <section className="tarjeta animate-entrada">
              <h2 className="titulo mb-1 text-2xl">Récords por ejercicio</h2>
              <p className="text-suave mb-3 text-xs">Peso máximo levantado y su evolución por sesión.</p>
              {records.length === 0 ? (
                <p className="text-suave py-6 text-center text-sm">Registra series con peso para ver tus récords.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {records.map((r) => (
                    <li key={r.ejercicioId} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.nombre}</p>
                        <p className="text-suave text-xs">
                          {r.grupo} · última vez {fechaRelativa(r.ultimaVez).toLowerCase()}
                        </p>
                      </div>
                      <MiniLinea valores={r.evolucion.map((e) => e.peso)} />
                      <div className="w-16 shrink-0 text-right">
                        <p className="titulo text-champagne text-2xl leading-none">{r.pesoMax ? num(r.pesoMax) : '—'}</p>
                        <p className="text-suave text-[10px]">kg máx.</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {vista === 'grupos' && (
            <section className="tarjeta animate-entrada">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="titulo text-2xl">Volumen por grupo</h2>
                  <p className="text-suave text-xs">Series × reps × kg</p>
                </div>
                <Segmentos
                  opciones={[
                    { valor: 'semana' as const, texto: 'Semana' },
                    { valor: 'mes' as const, texto: 'Mes' },
                  ]}
                  valor={periodo}
                  onChange={setPeriodo}
                />
              </div>
              {grupos.length === 0 ? (
                <p className="text-suave py-6 text-center text-sm">Aún no hay volumen registrado {periodo === 'semana' ? 'esta semana' : `en ${nombreMes(mes).toLowerCase()}`}.</p>
              ) : (
                <BarrasHorizontales datos={grupos.map((g) => ({ nombre: g.grupo, valor: g.volumen }))} formato={formatoVolumen} />
              )}
            </section>
          )}
        </>
      )}

      <Sheet formulario abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar sesión' : 'Nueva sesión'}>
        {editando && <FormSesion key={editando.id ?? editando.rutinaUid ?? 'nueva'} sesion={editando} historial={lista} onCerrar={() => setEditando(null)} />}
      </Sheet>
    </>
  );
}

function Historial({ lista, onAbrir }: { lista: Sesion[]; onAbrir: (s: Sesion) => void }) {
  return (
    <section className="tarjeta animate-entrada">
      <div className="flex flex-col divide-y divide-white/5">
        {lista.map((s) => (
          <button key={s.id} onClick={() => onAbrir(s)} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-white/[0.03]">
            <span className="bg-dorado/10 text-dorado grid size-10 shrink-0 place-items-center rounded-xl">
              <Icon name="entrenos" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{s.nombre}</span>
                <span className="text-suave shrink-0 text-xs">{fechaRelativa(s.fecha)}</span>
              </span>
              <span className="text-suave mt-0.5 block text-xs">
                {s.ejercicios.length} {s.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} · {s.ejercicios.reduce((t, e) => t + e.series.length, 0)} series ·{' '}
                <b className="text-champagne">{formatoVolumen(volumenSesion(s))}</b>
              </span>
              <span className="text-texto/70 mt-1 block truncate text-xs">{s.ejercicios.map((e) => e.nombre).join(' · ')}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
