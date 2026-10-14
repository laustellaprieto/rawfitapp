import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarPerfiles, responder } from '../../lib/coach';
import { fechaRelativa, toISO } from '../../lib/fechas';
import { traducirError, type PerfilNube } from '../../lib/nube';
import { normalizar } from '../../lib/busqueda';
import { Icon } from '../../components/Icon';
import { Encabezado, Segmentos, Vacio } from '../../components/ui';
import ClienteDetalle from './ClienteDetalle';
import { Avatar, nombreDe } from './comun';
import { Plantillas } from './Plantillas';


export default function PanelCoach() {
  const [perfiles, setPerfiles] = useState<PerfilNube[]>();
  const [error, setError] = useState('');
  const [vista, setVista] = useState<'clientes' | 'solicitudes' | 'plantillas'>('clientes');
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState<PerfilNube | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setPerfiles(await listarPerfiles());
    } catch (e) {
      setError(navigator.onLine ? traducirError(e) : 'El panel de coach necesita internet.');
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const pendientes = (perfiles ?? []).filter((p) => p.estado === 'pendiente');
  const clientes = useMemo(
    () => (perfiles ?? []).filter((p) => p.estado === 'aceptado' && normalizar(`${p.nombre} ${p.email}`).includes(normalizar(q.trim()))).sort((a, b) => nombreDe(a).localeCompare(nombreDe(b))),
    [perfiles, q],
  );

  if (abierto) return <ClienteDetalle cliente={abierto} onVolver={() => setAbierto(null)} />;

  const contestar = async (p: PerfilNube, aceptar: boolean) => {
    if (!aceptar && !confirm(`¿Rechazar la solicitud de ${nombreDe(p)}?`)) return;
    try {
      await responder(p.id, aceptar);
      await cargar();
    } catch (e) {
      alert(traducirError(e));
    }
  };

  return (
    <>
      <Encabezado subtitulo="Panel de coach" titulo="Mis clientes" />
      {error && (
        <p className="bg-sube/10 text-sube mb-4 rounded-xl px-3 py-2 text-sm">
          {error}{' '}
          <button className="font-semibold underline" onClick={cargar}>
            Reintentar
          </button>
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <Segmentos
          opciones={[
            { valor: 'clientes' as const, texto: `Clientes (${clientes.length})` },
            { valor: 'solicitudes' as const, texto: `Solicitudes${pendientes.length ? ` (${pendientes.length})` : ''}` },
            { valor: 'plantillas' as const, texto: 'Plantillas' },
          ]}
          valor={vista}
          onChange={setVista}
        />
        <button onClick={cargar} className="text-suave hover:text-texto p-2" aria-label="Actualizar">
          <Icon name="reloj" size={18} />
        </button>
      </div>

      {perfiles === undefined && !error && vista !== 'plantillas' && <p className="text-suave py-10 text-center text-sm">Cargando…</p>}

      {vista === 'plantillas' && <Plantillas />}

      {perfiles && vista === 'solicitudes' && (
        pendientes.length === 0 ? (
          <Vacio icono="usuarios" titulo="Sin solicitudes" texto="Cuando alguien toque “Quiero ser cliente” en su app, aparecerá aquí para que lo aceptes." />
        ) : (
          <ul className="flex flex-col gap-2">
            {pendientes.map((p) => (
              <li key={p.id} className="tarjeta animate-entrada flex items-center gap-3 !p-3">
                <Avatar p={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{nombreDe(p)}</p>
                  <p className="text-suave truncate text-xs">{p.email}</p>
                  {p.solicitado_en && <p className="text-suave text-[11px]">Pidió {fechaRelativa(toISO(new Date(p.solicitado_en))).toLowerCase()}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => contestar(p, false)} className="btn-sec !px-3 !py-2 text-xs" aria-label={`Rechazar a ${nombreDe(p)}`}>
                    <Icon name="cerrar" size={16} />
                  </button>
                  <button onClick={() => contestar(p, true)} className="btn-oro !px-3 !py-2 text-xs">
                    Aceptar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {perfiles && vista === 'clientes' && (
        <>
          <div className="relative mb-3">
            <Icon name="buscar" size={18} className="text-suave pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="campo !pl-10" placeholder="Buscar cliente…" type="search" aria-label="Buscar cliente" />
          </div>
          {clientes.length === 0 ? (
            <Vacio icono="usuarios" titulo="Aún no tienes clientes" texto="Pide a tus clientes que creen su cuenta en la app (Ajustes → Tu cuenta) y toquen “Quiero ser cliente”. Luego acéptalos en Solicitudes." />
          ) : (
            <ul className="tarjeta animate-entrada !p-1.5">
              {clientes.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setAbierto(p)} className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-white/5">
                    <Avatar p={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{nombreDe(p)}</span>
                      <span className="text-suave block truncate text-xs">
                        {p.email}
                        {p.compartir_fotos && ' · comparte fotos'}
                      </span>
                    </span>
                    <Icon name="der" size={18} className="text-suave" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
