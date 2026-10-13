import { db } from './db';
import { blobADataURL, dataURLABlob } from './image';
import { hoyISO } from './fechas';

const FORMATO = 'rawfit-kit-seguimiento';
const VERSION = 1;

type Fila = Record<string, unknown>;

export interface CopiaSeguridad {
  formato: typeof FORMATO;
  version: number;
  exportadoEn: string;
  tablas: Record<string, Fila[]>;
}

/** Exporta todas las tablas; los Blob (fotos) se guardan como data URL en base64. */
export async function crearCopia(): Promise<CopiaSeguridad> {
  const tablas: Record<string, Fila[]> = {};
  for (const t of db.tables) {
    const filas = (await t.toArray()) as Fila[];
    tablas[t.name] = await Promise.all(
      filas.map(async (f) => {
        const out: Fila = {};
        for (const [k, v] of Object.entries(f)) out[k] = v instanceof Blob ? { __blob: await blobADataURL(v) } : v;
        return out;
      }),
    );
  }
  return { formato: FORMATO, version: VERSION, exportadoEn: new Date().toISOString(), tablas };
}

/** Devuelve false si la persona canceló el menú de compartir. */
export async function descargarCopia(): Promise<boolean> {
  const copia = await crearCopia();
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
  const nombre = `rawfit-copia-${hoyISO()}.json`;
  const archivo = new File([blob], nombre, { type: 'application/json' });

  // En celulares ofrece el menú de compartir (Drive, WhatsApp, correo…) si está disponible.
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de seguridad RawFit' });
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/** Reemplaza todos los datos del dispositivo por los de la copia. Devuelve cuántas filas trae cada tabla. */
export async function importarCopia(file: File): Promise<Record<string, number>> {
  let datos: CopiaSeguridad;
  try {
    datos = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!datos || datos.formato !== FORMATO || typeof datos.tablas !== 'object') {
    throw new Error('Este archivo no es una copia de seguridad de RawFit.');
  }
  if (datos.version > VERSION) {
    throw new Error('La copia viene de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
  }

  const listas: Record<string, Fila[]> = {};
  for (const t of db.tables) {
    listas[t.name] = await Promise.all(
      (datos.tablas[t.name] ?? []).map(async (f) => {
        const out: Fila = {};
        for (const [k, v] of Object.entries(f))
          out[k] = v && typeof v === 'object' && '__blob' in (v as Fila) ? await dataURLABlob((v as { __blob: string }).__blob) : v;
        return out;
      }),
    );
  }

  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear();
      if (listas[t.name].length) await t.bulkPut(listas[t.name]);
    }
  });

  return Object.fromEntries(Object.entries(listas).map(([k, v]) => [k, v.length]));
}

export async function borrarTodo() {
  await db.delete();
  await db.open(); // se vuelve a crear con los hábitos iniciales y el onboarding
}
