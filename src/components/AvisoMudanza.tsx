import { useState } from 'react';
import { descargarCopia } from '../lib/copia';
import { useCuenta } from '../lib/nube';

/** Dirección actual de la app. Si alguien la abre desde la dirección vieja, se le muestra cómo mudarse. */
export const URL_APP = 'https://rawfitapp.laustellaprieto-m.workers.dev';
const DOMINIOS_VIEJOS = ['vercel.app'];

export const enDireccionVieja = () => DOMINIOS_VIEJOS.some((d) => window.location.hostname.endsWith(d));

/** Aviso en la dirección vieja (Vercel): explica cómo llevar los datos a la app nueva. */
export function AvisoMudanza() {
  const cuenta = useCuenta();
  const [exportado, setExportado] = useState(false);
  if (!enDireccionVieja()) return null;
  const abrir = () => (window.location.href = URL_APP);

  return (
    <div className="bg-dorado/12 border-dorado/40 mx-auto max-w-2xl border-b px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 sm:rounded-b-3xl sm:border-x">
      <p className="titulo text-champagne text-2xl leading-none">La app se mudó 🏠</p>
      {cuenta.sesion ? (
        <p className="mt-1.5 text-sm">
          Tu progreso está guardado en tu cuenta. Abre la app nueva, <b>inicia sesión</b> con tu correo y sigue donde ibas. Después instálala de nuevo en tu pantalla de inicio.
        </p>
      ) : (
        <ol className="mt-1.5 flex list-decimal flex-col gap-0.5 pl-5 text-sm">
          <li>
            Toca <b>Exportar mis datos</b> y guarda el archivo.
          </li>
          <li>
            Abre la <b>app nueva</b> e instálala en tu pantalla de inicio.
          </li>
          <li>
            En la app nueva toca <b>Importar copia</b> (al empezar o en Ajustes) y elige el archivo.
          </li>
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!cuenta.sesion && (
          <button
            className="btn-sec !py-2 text-xs"
            onClick={async () => {
              if (await descargarCopia().catch(() => false)) setExportado(true);
            }}
          >
            {exportado ? '✓ Datos exportados' : '1. Exportar mis datos'}
          </button>
        )}
        <button className="btn-oro !py-2 text-xs" onClick={abrir}>
          {cuenta.sesion ? 'Abrir la app nueva' : '2. Abrir la app nueva'}
        </button>
      </div>
      <p className="text-suave mt-2 text-[11px] break-all">{URL_APP.replace('https://', '')}</p>
    </div>
  );
}
