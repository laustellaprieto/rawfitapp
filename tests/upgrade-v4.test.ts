/** v3 → v4 (solo índices nuevos): los datos no cambian y los cambios pendientes se encuentran por índice. */
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import Dexie from 'dexie';

async function main() {
  // Base como la dejaba la versión 3 de la app, con cambios pendientes de subir.
  const v3 = new Dexie('rawfit-kit');
  v3.version(3).stores({
    perfil: 'id, &uid', habitos: '++id, orden, &uid', registros: '[habitoId+fecha], habitoId, fecha, &uid', mediciones: '++id, fecha, &uid',
    checkins: '++id, fecha, &uid', fotos: '++id, checkinId, &uid', sesiones: '++id, fecha, &uid', ejerciciosPropios: '++id, &uid',
    logros: 'id, fecha, &uid', rutinas: '++id, orden, &uid', nutricion: '++id, &uid', borrados: 'clave', meta: 'clave', comidas: '++id, fecha, &uid',
  });
  await v3.table('habitos').bulkAdd([{ nombre: 'Agua', emoji: '💧', orden: 0, activo: true, uid: 'h1', _p: 1 }, { nombre: 'Dormir', emoji: '😴', orden: 1, activo: true, uid: 'h2' }]);
  await v3.table('fotos').bulkAdd([{ checkinId: 1, pose: 'frente', uid: 'f1', _p: 1 }, { checkinId: 1, pose: 'perfil', uid: 'f2', checkinUid: 'c1' }]);
  await v3.table('comidas').add({ fecha: '2026-10-01', hora: '13:00', tipo: 'Almuerzo', nota: 'Sopa', uid: 'co1', _p: 1 });
  const antes = JSON.stringify(await Promise.all(['habitos', 'fotos', 'comidas'].map((t) => v3.table(t).toArray())));
  v3.close();

  const { db } = await import('../src/lib/db');
  await db.open();
  assert.equal(db.verno, 4);
  const despues = JSON.stringify(await Promise.all(['habitos', 'fotos', 'comidas'].map((t) => db.table(t).toArray())));
  assert.equal(despues, antes, 'los datos quedan idénticos');
  assert.deepEqual((await db.habitos.where('_p').equals(1).toArray()).map((h) => h.uid), ['h1']);
  assert.deepEqual((await db.fotos.where('_p').equals(1).toArray()).map((f) => f.uid), ['f1']);
  assert.equal(await db.comidas.where('_p').equals(1).count(), 1);
  assert.equal(await db.fotos.orderBy('checkinUid').count(), 1, 'el índice checkinUid solo tiene las fotos enlazadas');
  console.log('✓ v3 → v4: datos idénticos y los pendientes se encuentran por índice');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
