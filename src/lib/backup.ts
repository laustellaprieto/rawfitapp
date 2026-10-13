import { db, type Ajustes, type Entreno, type Foto, type Habito, type Medida, type RegistroHabito } from './db';
import { blobADataURL, dataURLABlob } from './image';
import { hoyISO } from './dates';

const FORMATO = 'rawfit-kit-seguimiento';
const VERSION = 1;

interface FotoExportada extends Omit<Foto, 'imagen'> {
  imagen: string; // data URL base64
}

export interface CopiaSeguridad {
  formato: typeof FORMATO;
  version: number;
  exportadoEn: string;
  ajustes: Ajustes[];
  habitos: Habito[];
  registros: RegistroHabito[];
  medidas: Medida[];
  entrenos: Entreno[];
  fotos: FotoExportada[];
}

export async function crearCopia(): Promise<CopiaSeguridad> {
  const [ajustes, habitos, registros, medidas, entrenos, fotos] = await Promise.all([
    db.ajustes.toArray(),
    db.habitos.toArray(),
    db.registros.toArray(),
    db.medidas.toArray(),
    db.entrenos.toArray(),
    db.fotos.toArray(),
  ]);
  const fotosExp: FotoExportada[] = [];
  for (const f of fotos) fotosExp.push({ ...f, imagen: await blobADataURL(f.imagen) });
  return {
    formato: FORMATO,
    version: VERSION,
    exportadoEn: new Date().toISOString(),
    ajustes,
    habitos,
    registros,
    medidas,
    entrenos,
    fotos: fotosExp,
  };
}

export async function descargarCopia() {
  const copia = await crearCopia();
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
  const nombre = `rawfit-copia-${hoyISO()}.json`;
  const archivo = new File([blob], nombre, { type: 'application/json' });

  // En celulares, ofrecer el menú de compartir (guardar en Drive, WhatsApp, etc.) si está disponible.
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de seguridad RawFit' });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
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
}

export interface ResumenImportacion {
  habitos: number;
  registros: number;
  medidas: number;
  entrenos: number;
  fotos: number;
}

export async function importarCopia(file: File): Promise<ResumenImportacion> {
  let datos: CopiaSeguridad;
  try {
    datos = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!datos || datos.formato !== FORMATO) {
    throw new Error('Este archivo no es una copia de seguridad de RawFit.');
  }
  if (datos.version > VERSION) {
    throw new Error('La copia viene de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
  }

  const fotos: Foto[] = [];
  for (const f of datos.fotos ?? []) fotos.push({ ...f, imagen: await dataURLABlob(f.imagen) });

  await db.transaction('rw', [db.ajustes, db.habitos, db.registros, db.medidas, db.entrenos, db.fotos], async () => {
    await Promise.all([
      db.ajustes.clear(),
      db.habitos.clear(),
      db.registros.clear(),
      db.medidas.clear(),
      db.entrenos.clear(),
      db.fotos.clear(),
    ]);
    if (datos.ajustes?.length) await db.ajustes.bulkPut(datos.ajustes);
    await db.habitos.bulkPut(datos.habitos ?? []);
    await db.registros.bulkPut(datos.registros ?? []);
    await db.medidas.bulkPut(datos.medidas ?? []);
    await db.entrenos.bulkPut(datos.entrenos ?? []);
    await db.fotos.bulkPut(fotos);
  });

  return {
    habitos: datos.habitos?.length ?? 0,
    registros: datos.registros?.length ?? 0,
    medidas: datos.medidas?.length ?? 0,
    entrenos: datos.entrenos?.length ?? 0,
    fotos: fotos.length,
  };
}

export async function borrarTodo() {
  await db.delete();
  await db.open(); // vuelve a crear la base con los hábitos iniciales
}
