/** Mide cuánto tarda una sincronización sin cambios pendientes con muchas fotos guardadas. */
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { paraGuardar } from '../src/lib/image';
import { sincronizar, type Remoto } from '../src/lib/sync';

const r: Remoto = {
  userId: 'u',
  traerCambios: async () => [],
  contarFilas: async () => 0,
  guardar: async () => {},
  subirArchivo: async () => {},
  bajarArchivo: async () => new Blob(),
  borrarArchivo: async () => {},
};

async function main() {
  const foto = await paraGuardar(new Blob([new Uint8Array(300_000)], { type: 'image/jpeg' }));
  const checkinId = (await db.checkins.add({ fecha: '2026-10-01' })) as number;
  await db.comidas.bulkAdd(Array.from({ length: 150 }, (_, i) => ({ fecha: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, hora: '12:00', tipo: 'Almuerzo' as const, imagen: foto, fotoV: 1 })));
  await db.fotos.bulkAdd(Array.from({ length: 60 }, () => ({ checkinId, pose: 'frente' as const, imagen: foto })));
  await sincronizar(r, true); // sube todo (primera vez)
  const tiempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    await sincronizar(r, true);
    tiempos.push(performance.now() - t);
  }
  tiempos.sort((a, b) => a - b);
  console.log(`Sincronización sin cambios (150 comidas + 60 fotos de 300 KB): mediana ${tiempos[2].toFixed(0)} ms`);
}
main();
