/**
 * Actualizaciones de la app y registro de errores.
 * - La app NO se recarga sola cuando hay versión nueva (eso podía dejar la pantalla en negro a mitad de uso):
 *   muestra un aviso "Nueva versión" y se actualiza cuando la persona toca el botón.
 * - Los últimos errores se guardan en el dispositivo para poder enviarlos a soporte.
 */
import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

let hayVersionNueva = false;
let actualizar: ((recargar?: boolean) => Promise<void>) | undefined;
const oyentes = new Set<() => void>();

export function iniciarActualizaciones() {
  actualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      hayVersionNueva = true;
      oyentes.forEach((f) => f());
    },
    onRegisteredSW(_url, registro) {
      // Revisa si hay versión nueva al volver a la app y cada hora.
      const revisar = () => registro?.update().catch(() => {});
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && revisar());
      setInterval(revisar, 60 * 60 * 1000);
    },
  });
}

export function useVersionNueva() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => hayVersionNueva,
  );
}

export function actualizarAhora() {
  if (actualizar) actualizar(true);
  else window.location.reload();
}

/* ───────────── Registro de errores ───────────── */

const CLAVE = 'rawfit-errores';
export interface ErrorGuardado {
  fecha: string;
  mensaje: string;
  donde?: string; // pila de llamadas (archivo y línea)
  componentes?: string; // pila de componentes de React
  pagina?: string;
  version?: string;
  navegador?: string;
}

export function guardarError(e: unknown, componentes?: string) {
  try {
    const lista: ErrorGuardado[] = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    const err = e as Error;
    lista.unshift({
      fecha: new Date().toISOString(),
      mensaje: `${err?.name ?? 'Error'}: ${err?.message ?? String(e)}`.slice(0, 300),
      donde: err?.stack?.slice(0, 1500),
      componentes: componentes?.slice(0, 1200),
      pagina: window.location.hash || '#hoy',
      version: __VERSION__,
      navegador: navigator.userAgent,
    });
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 15)));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function erroresGuardados(): ErrorGuardado[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]');
  } catch {
    return [];
  }
}

export function borrarErrores() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}

export function escucharErrores() {
  window.addEventListener('error', (ev) => guardarError(ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => guardarError(ev.reason));
}

/** Texto del reporte de fallas, para copiarlo y enviarlo a soporte. */
export function textoReporte(errores = erroresGuardados()): string {
  return errores
    .map((e) => [`${e.fecha} · ${e.mensaje}`, `Pantalla: ${e.pagina ?? '?'} · Versión: ${e.version ?? '?'}`, e.navegador, e.donde, e.componentes].filter(Boolean).join('\n'))
    .join('\n\n────────\n\n');
}

/** Copia el reporte al portapapeles (o lo muestra para copiarlo a mano). */
export async function copiarReporte(): Promise<boolean> {
  const texto = textoReporte();
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    prompt('Copia este texto:', texto);
    return false;
  }
}
